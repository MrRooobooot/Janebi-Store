const db = require("better-sqlite3")("/app/data/janebi.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
const fkTables = [];
for (const t of tables) {
  const fks = db.prepare(`PRAGMA foreign_key_list(${t})`).all();
  if (fks.some((f) => f.table === "users")) fkTables.push(t + " (" + fks.filter((f) => f.table === "users").map((f) => f.from).join(",") + ")");
}
console.log("tables referencing users:", fkTables.join(" | "));
const orderFks = [];
for (const t of tables) {
  const fks = db.prepare(`PRAGMA foreign_key_list(${t})`).all();
  if (fks.some((f) => f.table === "orders")) orderFks.push(t);
}
console.log("tables referencing orders:", orderFks.join(","));
