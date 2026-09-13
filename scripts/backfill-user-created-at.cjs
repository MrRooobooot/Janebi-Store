// backfill-user-created-at.cjs — R3: give legacy users a real chronology.
//
// Why: users.joined_date stores Persian *display* text (۱۴۰۵/۶/۷), so ORDER BY on it
// is not chronological. The 0012 migration fills created_at for epoch ids (usr-<ms>);
// this script fills the remainder by reverse-resolving the stored Jalali date, so no
// fabricated timestamps: rows that cannot be resolved stay NULL and sort oldest.
//
// Usage (inside the container, or locally with DATABASE_FILE):
//   node scripts/backfill-user-created-at.cjs inspect|apply
'use strict';

const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_FILE || '/app/data/janebi.db';
const mode = process.argv[2] || 'inspect';
const db = new Database(DB_PATH);

// Reverse Jalali lookup: the stored string was produced by Intl fa-IR, so format every
// day in a window and match the text. Exact, no hand-rolled calendar math.
const fmt = new Intl.DateTimeFormat('fa-IR');
function jalaliToMs(text) {
  const target = String(text || '').trim();
  if (!target) return null;
  const start = Date.UTC(2015, 0, 1);
  const end = Date.now();
  let found = null;
  for (let t = start; t <= end; t += 86400000) {
    if (fmt.format(new Date(t)) === target) found = t;
  }
  return found;
}

const pending = db
  .prepare("select id, joined_date from users where created_at is null")
  .all();

console.log('rows missing created_at:', pending.length);
const plan = pending.map((u) => {
  const ms = /^usr-\d{13}$/.test(u.id) ? Number(u.id.slice(4)) : jalaliToMs(u.joined_date);
  return { id: u.id, joined_date: u.joined_date, created_at: ms };
});
console.log('resolved:', plan.filter((p) => p.created_at).length, '/', plan.length);
console.log(
  'unresolved (will keep NULL → sorts oldest):',
  JSON.stringify(plan.filter((p) => !p.created_at).map((p) => p.id))
);

if (mode !== 'apply') {
  console.log('INSPECT ONLY — re-run with `apply` to write');
  process.exit(0);
}

const upd = db.prepare('update users set created_at = ? where id = ? and created_at is null');
const tx = db.transaction((rows) => {
  let n = 0;
  for (const r of rows) if (r.created_at) n += upd.run(r.created_at, r.id).changes;
  return n;
});
console.log('updated:', tx(plan));
console.log('still null:', db.prepare('select count(*) n from users where created_at is null').get().n);
console.log('integrity:', db.prepare('PRAGMA integrity_check').get().integrity_check);
console.log('foreign_key_check rows:', db.prepare('PRAGMA foreign_key_check').all().length);
console.log(
  'head:',
  JSON.stringify(
    db.prepare('select id, created_at from users order by coalesce(created_at,0) desc limit 5').all()
  )
);
