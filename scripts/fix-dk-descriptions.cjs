const db = require("better-sqlite3")("/app/data/janebi.db");
const tx = db.transaction(() => {
  const rows = db.prepare("SELECT id, title, brand, description FROM products WHERE sku LIKE 'DK-%' AND description LIKE 'http%'").all();
  let fixedDesc = 0;
  for (const r of rows) {
    const m = /dkp-(\d+)/.exec(r.description || "");
    const dkpId = m ? m[1] : String(r.id);
    const brand = r.brand && r.brand !== "UNKNOWN" ? `برند ${r.brand} — ` : "";
    const finalDesc = `${brand}${r.title}\n\nکالای اورجینال لوازم جانبی؛ پیش از ارسال، اصالت و سلامت فیزیکی کالا کنترل می‌شود.\nمنبع استعلام قیمت و مشخصات: دیجی‌کالا (dkp-${dkpId})`;
    db.prepare("UPDATE products SET description=?, warranty=? WHERE id=?").run(finalDesc, "ضمانت اصالت کالا", r.id);
    fixedDesc++;
  }
  return { fixedDesc };
});
const res = tx();
console.log(JSON.stringify(res));
