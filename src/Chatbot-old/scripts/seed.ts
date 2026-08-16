import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import { EXTRACTION_PROMPT } from '../lib/prompts/extraction';

const DB_PATH = path.join(process.cwd(), 'data', 'schools.db');
const CSV_PATH = path.join(process.cwd(), 'data', 'thailand-schools-seed.csv');
const FAILED_PATH = path.join(process.cwd(), 'data', 'failed-scrapes.json');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    website TEXT NOT NULL,
    curricula TEXT,
    age_from INTEGER,
    age_to INTEGER,
    fees_min_usd INTEGER,
    fees_max_usd INTEGER,
    boarding INTEGER DEFAULT 0,
    day INTEGER DEFAULT 1,
    description TEXT,
    hero_image_url TEXT
  )
`);

const insert = db.prepare(`
  INSERT OR REPLACE INTO schools (slug, name, city, country, website, curricula, age_from, age_to, fees_min_usd, fees_max_usd, boarding, day, description, hero_image_url)
  VALUES (@slug, @name, @city, @country, @website, @curricula, @age_from, @age_to, @fees_min_usd, @fees_max_usd, @boarding, @day, @description, @hero_image_url)
`);

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SchoolChatbotResearch/0.1' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function checkRobots(baseUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const text = await fetchPage(robotsUrl);
    const lines = text.split('\n');
    let applies = false;
    for (const line of lines) {
      const lower = line.toLowerCase().trim();
      if (lower.startsWith('user-agent:')) {
        applies = lower.includes('*') || lower.includes('schoolchatbotresearch');
      }
      if (applies && lower.startsWith('disallow: /')) {
        const path = lower.replace('disallow:', '').trim();
        if (path === '/') return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

async function extractSchoolData(html: string, schoolName: string): Promise<Record<string, unknown>> {
  const truncated = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 8000);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: `School: ${schoolName}\n\nContent:\n${truncated}` }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : {};
}

async function processSchool(row: Record<string, string>, failed: unknown[]) {
  const { name, city, country, website } = row;
  if (!name || !website) return;

  // Skip competitor platforms
  const skipDomains = ['doris', 'iscresearch', 'isc-research', 'goodschoolsguide'];
  if (skipDomains.some(d => website.includes(d))) {
    console.log(`Skipping competitor: ${website}`);
    return;
  }

  console.log(`Processing: ${name}`);

  try {
    const allowed = await checkRobots(website);
    if (!allowed) {
      console.log(`  Robots.txt disallows: ${website}`);
      failed.push({ name, website, reason: 'robots.txt' });
      return;
    }

    await delay(3000);

    let combinedHtml = '';
    const pagesToFetch = [website];

    const subPages = ['admissions', 'fees', 'curriculum', 'academics'];
    for (const page of subPages.slice(0, 2)) {
      pagesToFetch.push(`${website.replace(/\/$/, '')}/${page}`);
    }

    for (const url of pagesToFetch) {
      try {
        const html = await fetchPage(url);
        combinedHtml += html.slice(0, 15000);
        await delay(3000);
      } catch {
        // sub-page may not exist
      }
    }

    if (!combinedHtml) {
      failed.push({ name, website, reason: 'fetch failed' });
      return;
    }

    const extracted = await extractSchoolData(combinedHtml, name);

    insert.run({
      slug: toSlug(name),
      name,
      city: city || '',
      country: country || 'Thailand',
      website,
      curricula: JSON.stringify(extracted.curricula || []),
      age_from: extracted.age_from || 3,
      age_to: extracted.age_to || 18,
      fees_min_usd: extracted.fees_min_usd || null,
      fees_max_usd: extracted.fees_max_usd || null,
      boarding: extracted.boarding ? 1 : 0,
      day: 1,
      description: extracted.description || null,
      hero_image_url: null,
    });

    console.log(`  ✓ Inserted: ${name}`);
  } catch (err) {
    const error = err as Error;
    console.log(`  ✗ Failed: ${name} — ${error.message}`);
    failed.push({ name, website, reason: error.message });
  }
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
  });

  const failed: unknown[] = [];
  console.log(`Processing ${rows.length} schools...`);

  for (const row of rows) {
    await processSchool(row, failed);
  }

  fs.writeFileSync(FAILED_PATH, JSON.stringify(failed, null, 2));
  console.log(`\nDone. ${failed.length} failures logged to ${FAILED_PATH}`);
}

main().catch(console.error);
