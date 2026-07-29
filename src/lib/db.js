import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Private data lives OUTSIDE the repo working tree in production (set DATA_DIR).
// The local default data/private/ is gitignored as a second layer of defense.
const dir = process.env.DATA_DIR || 'data/private';
mkdirSync(dir, { recursive: true });

const db = new Database(path.join(dir, 'site.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    slug TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS waitlist (
    email TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    window_start INTEGER NOT NULL
  );
`);

const stmts = {
  getVote: db.prepare('SELECT count FROM votes WHERE slug = ?'),
  allVotes: db.prepare('SELECT slug, count FROM votes'),
  addVote: db.prepare(`
    INSERT INTO votes (slug, count) VALUES (?, 1)
    ON CONFLICT(slug) DO UPDATE SET count = count + 1
  `),
  addEmail: db.prepare('INSERT OR IGNORE INTO waitlist (email) VALUES (?)'),
  addSponsor: db.prepare('INSERT INTO sponsors (email, message) VALUES (?, ?)'),
  getLimit: db.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?'),
  setLimit: db.prepare(`
    INSERT INTO rate_limits (key, count, window_start) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET count = excluded.count, window_start = excluded.window_start
  `),
};

export function voteCount(slug) {
  return stmts.getVote.get(slug)?.count ?? 0;
}

export function voteCounts() {
  const map = new Map(stmts.allVotes.all().map((r) => [r.slug, r.count]));
  return (slug) => map.get(slug) ?? 0;
}

export function addVote(slug) {
  stmts.addVote.run(slug);
  return voteCount(slug);
}

export function addToWaitlist(email) {
  return stmts.addEmail.run(email).changes > 0;
}

export function addSponsorInquiry(email, message) {
  stmts.addSponsor.run(email, message?.slice(0, 2000) ?? null);
}

// Fixed-window rate limit, persisted so restarts don't reset abuse counters.
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const row = stmts.getLimit.get(key);
  if (!row || now - row.window_start > windowMs) {
    stmts.setLimit.run(key, 1, now);
    return true;
  }
  if (row.count >= max) return false;
  stmts.setLimit.run(key, row.count + 1, row.window_start);
  return true;
}

// The headline number: total monthly cost of every subscription on the death
// list — the full pool of MRR the list puts at risk. (Was votes × price, but
// the sum of the whole list is the honest "here's what's on the table" stat.)
export function mrrDestroyed(apps) {
  return Math.round(apps.reduce((sum, a) => sum + (a.priceMonthly ?? 0), 0));
}
