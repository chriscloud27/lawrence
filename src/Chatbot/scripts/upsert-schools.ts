import fs from "fs";
import path from "path";

// Load .env.local before importing anything that uses env vars
const envPath = path.join(process.cwd(), "../../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#") && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      if (value) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// Ensure NEXT_PUBLIC_SUPABASE_URL is set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing env vars:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function loadSampleRecords() {
  const samplesDir = path.join(
    process.cwd(),
    "../../.claude/docs/data/sample-records",
  );
  const files = fs.readdirSync(samplesDir).filter((f) => f.endsWith(".json"));

  const records = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(samplesDir, file), "utf-8");
    records.push(JSON.parse(content));
  }
  return records;
}

async function upsertSchools(records: any[]) {
  console.log(`📚 Upserting ${records.length} schools...\n`);

  let insertedCount = 0;

  for (const record of records) {
    const { school, fees, entry_points } = record;

    // Validate required fields
    if (!school.id || !school.slug || !school.name || !school.source_url) {
      console.error(`❌ Invalid school record: missing required fields`);
      continue;
    }

    // Upsert school
    const { error: schoolError } = await supabase
      .from("schools")
      .upsert([school], { onConflict: "id" });

    if (schoolError) {
      console.error(
        `❌ Error upserting school ${school.slug}:`,
        schoolError.message,
      );
      continue;
    }

    // Upsert school_fees
    if (fees && fees.length > 0) {
      const feesData = fees.map((fee: any) => ({
        ...fee,
        school_id: school.id,
        scraped_at: new Date().toISOString(),
      }));

      const { error: feesError } = await supabase
        .from("school_fees")
        .upsert(feesData, { onConflict: "school_id,fee_type,year_group" });

      if (feesError) {
        console.warn(
          `⚠️  Warning upserting fees for ${school.slug}: ${feesError.message}`,
        );
      }
    }

    // Upsert school_entry_points
    if (entry_points && entry_points.length > 0) {
      const entryData = entry_points.map((entry: any) => ({
        ...entry,
        school_id: school.id,
        scraped_at: new Date().toISOString(),
      }));

      const { error: entryError } = await supabase
        .from("school_entry_points")
        .upsert(entryData, { onConflict: "school_id,label" });

      if (entryError) {
        console.warn(
          `⚠️  Warning upserting entry points for ${school.slug}: ${entryError.message}`,
        );
      }
    }

    console.log(`✅ ${school.name}`);
    insertedCount++;
  }

  console.log(
    `\n✨ Upserted ${insertedCount}/${records.length} schools successfully`,
  );
  return insertedCount === records.length;
}

async function main() {
  try {
    const records = await loadSampleRecords();
    console.log(`Found ${records.length} sample records\n`);

    const success = await upsertSchools(records);
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
