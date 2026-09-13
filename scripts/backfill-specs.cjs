// backfill-specs.cjs — run INSIDE janebi-store container: PUT /api/admin/products/:id
// for every plan entry (features + clean title/desc + JB- sku + p- image path).
// Source of truth: /tmp/specs-backfill-plan.json (docs/specs-backfill-plan.json in repo).
// Auth: self-signed short-lived admin JWT (in-container, secret never leaves).
const jwt = require('jsonwebtoken');
const fs = require('fs');

const plan = JSON.parse(fs.readFileSync('/tmp/specs-backfill-plan.json', 'utf8'));
const token = jwt.sign({ userId: 'usr-admin-aidin' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30m' });

(async () => {
  let ok = 0, fail = [];
  for (const e of plan) {
    const body = {
      title: e.title,
      description: e.description ?? undefined,
      features: e.features,
    };
    if (e.sku) body.sku = e.sku;
    if (e.image) body.image = e.image;
    const r = await fetch('http://127.0.0.1:3000/api/admin/products/' + e.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    if (r.status === 200) ok++;
    else fail.push({ id: e.id, status: r.status, err: (await r.text()).slice(0, 120) });
    await new Promise(res => setTimeout(res, 120));
  }
  console.log(JSON.stringify({ total: plan.length, ok, fail: fail.slice(0, 5), failCount: fail.length }));
})();
