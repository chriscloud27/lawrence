// Extracts Doris JSON-LD from .claude/docs/data/sources/html-saved/*.html and upserts
// schools + school_fees into Supabase. No LLM extraction step — see doris-school.md for
// which fields raw JSON-LD can't provide (curricula, strengths, sen_support, etc.); those
// are left at column defaults and scrape_status is set to 'needs_review'.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const ROOT = new URL('..', import.meta.url).pathname;
const HTML_DIR = `${ROOT}.claude/docs/data/sources/html-saved`;

const SOCIAL_HOSTS = {
  'instagram.com': 'instagram_url',
  'facebook.com': 'facebook_url',
  'linkedin.com': 'linkedin_url',
};
const IGNORED_SAMEAS_HOSTS = ['youtube.com', 'twitter.com', 'x.com', 'tiktok.com'];

const COUNTRY_NAMES = { TH: 'Thailand', GB: 'United Kingdom', US: 'United States' };

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function extractJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no JSON-LD block found');
  return JSON.parse(match[1]);
}

function toSchoolRow(ld, contentHash) {
  const slug = new URL(ld.url).pathname.split('/').filter(Boolean).pop();

  let officialUrl = null;
  let instagramUrl = null;
  let facebookUrl = null;
  let linkedinUrl = null;
  for (const link of ld.sameAs ?? []) {
    const host = hostOf(link);
    if (!host || IGNORED_SAMEAS_HOSTS.includes(host)) continue;
    const socialField = SOCIAL_HOSTS[host];
    if (socialField === 'instagram_url') instagramUrl = link;
    else if (socialField === 'facebook_url') facebookUrl = link;
    else if (socialField === 'linkedin_url') linkedinUrl = link;
    else if (!officialUrl) officialUrl = link;
  }

  const ageMatch = /Ages\s+(\d+)\s+to\s+(\d+)/i.exec(ld.educationalLevel ?? '');

  return {
    slug,
    name: ld.name,
    source_url: ld.url,
    official_url: officialUrl,
    address_city: ld.address?.addressLocality
      ? ld.address.addressLocality.replace(/\b\w/g, (c) => c.toUpperCase())
      : null,
    address_country: ld.address?.addressCountry
      ? COUNTRY_NAMES[ld.address.addressCountry] ?? ld.address.addressCountry
      : null,
    lat: ld.geo?.latitude ?? null,
    lng: ld.geo?.longitude ?? null,
    description: ld.description ? ld.description.slice(0, 500) : null,
    student_count: ld.numberOfStudents?.value ?? null,
    age_min: ageMatch ? Number(ageMatch[1]) : null,
    age_max: ageMatch ? Number(ageMatch[2]) : null,
    instagram_url: instagramUrl,
    linkedin_url: linkedinUrl,
    facebook_url: facebookUrl,
    content_hash: contentHash,
    last_scraped_at: new Date().toISOString(),
    last_modified_at: ld.dateModified ?? null,
    extraction_confidence: null,
    scrape_status: 'needs_review',
  };
}

const YEAR_GROUP_RE = /^(Pre-K|Nursery|Reception|K\d+|Grade\s?\d+|Year\s?\d+|Sixth Form)$/i;

function toFeeRows(ld) {
  return (ld.makesOffer ?? []).map((offer) => {
    const [label, feeType] = offer.name.split(/\s+–\s+/);
    return {
      year_group: label && YEAR_GROUP_RE.test(label.trim()) ? label.trim() : null,
      fee_type: feeType ?? 'additional_fee',
      label: label ?? offer.name,
      amount: offer.price,
      currency: offer.priceCurrency,
      notes: offer.description ?? null,
    };
  });
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const skipConfirm = process.argv.includes('--yes');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (see .env.example)');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const files = readdirSync(HTML_DIR).filter((f) => f.endsWith('.html'));
  if (files.length === 0) throw new Error(`no .html files found in ${HTML_DIR}`);

  const records = files.map((file) => {
    const raw = readFileSync(`${HTML_DIR}/${file}`);
    const ld = extractJsonLd(raw.toString('utf8'));
    const contentHash = createHash('md5').update(raw).digest('hex');
    return { file, school: toSchoolRow(ld, contentHash), fees: toFeeRows(ld) };
  });

  console.log(`Target: ${hostOf(supabaseUrl) ?? supabaseUrl}`);
  console.log(`Found ${records.length} source file(s):`);
  for (const r of records) {
    console.log(`  ${r.school.slug} — ${r.fees.length} fee row(s) (from ${r.file})`);
  }

  if (!skipConfirm) {
    const ok = await confirm('Upsert these into the database above?');
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  let upserted = 0;
  let feeRows = 0;
  const errors = [];

  for (const { school, fees } of records) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .upsert(school, { onConflict: 'slug' })
        .select('id')
        .single();
      if (error) throw error;

      const schoolId = data.id;
      const { error: deleteFeesError } = await supabase.from('school_fees').delete().eq('school_id', schoolId);
      if (deleteFeesError) throw deleteFeesError;
      const { error: deleteEntryPointsError } = await supabase
        .from('school_entry_points')
        .delete()
        .eq('school_id', schoolId);
      if (deleteEntryPointsError) throw deleteEntryPointsError;

      if (fees.length > 0) {
        const { error: insertFeesError } = await supabase
          .from('school_fees')
          .insert(fees.map((fee) => ({ ...fee, school_id: schoolId })));
        if (insertFeesError) throw insertFeesError;
      }

      upserted += 1;
      feeRows += fees.length;
      console.log(`ok: ${school.slug}`);
    } catch (err) {
      errors.push({ slug: school.slug, message: err.message ?? String(err) });
      console.error(`failed: ${school.slug} — ${err.message ?? err}`);
    }
  }

  console.log(`\n${upserted}/${records.length} schools upserted, ${feeRows} fee rows written.`);
  if (errors.length > 0) {
    console.log(`${errors.length} error(s):`);
    for (const e of errors) console.log(`  ${e.slug}: ${e.message}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
