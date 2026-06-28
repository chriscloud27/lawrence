import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'schools.db');

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      classification TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      score_breakdown TEXT,
      captured_name TEXT,
      captured_email TEXT,
      location TEXT,
      timeline TEXT,
      forcing_function TEXT,
      child_age INTEGER,
      current_school TEXT,
      curriculum TEXT,
      budget_range_usd TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

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
    );
  `);

  _db = drizzle(sqlite, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});
