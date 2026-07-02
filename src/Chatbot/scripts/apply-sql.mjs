// Apply a .sql file to the database in DATABASE_URL. Works against local or cloud.
// Usage (from repo root):
//   node --env-file=src/Chatbot/.env.local src/Chatbot/scripts/apply-sql.mjs supabase/seed_scrape_queue.sql
// Lives under src/Chatbot/ so it resolves the `postgres` client from the chatbot's node_modules.
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set (pass --env-file=src/Chatbot/.env.local or export it)');
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error('usage: node apply-sql.mjs <path-to.sql>');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
  await sql.unsafe(readFileSync(file, 'utf8'));
  console.log(`applied ${file}`);
} catch (e) {
  console.error(`failed applying ${file}: ${e.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
