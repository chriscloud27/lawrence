import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.join(process.cwd(), "../../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#") && valueParts.length > 0) {
    const value = valueParts.join("=").trim();
    if (value) process.env[key.trim()] = value;
  }
});

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

async function verifySchools() {
  console.log("📊 Verifying schools in database...\n");

  // Count schools
  const { count: schoolCount } = await supabase
    .from("schools")
    .select("*", { count: "exact" });

  // Count fees
  const { count: feeCount } = await supabase
    .from("school_fees")
    .select("*", { count: "exact" });

  // Count entry points
  const { count: entryCount } = await supabase
    .from("school_entry_points")
    .select("*", { count: "exact" });

  console.log(`✅ Total schools: ${schoolCount}`);
  console.log(`✅ Total fees: ${feeCount}`);
  console.log(`✅ Total entry points: ${entryCount}`);

  // Show sample schools
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, address_city, address_country")
    .order("created_at", { ascending: false })
    .limit(6);

  console.log("\n📚 Sample schools (most recent):");
  if (schools) {
    schools.forEach((s) => {
      console.log(`  - ${s.name} (${s.address_city}, ${s.address_country})`);
    });
  }
}

verifySchools().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
