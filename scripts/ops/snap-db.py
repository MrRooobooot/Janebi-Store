"""Fresh snapshot from LIVE container DB (the mounted host path is the real one)."""
import shutil, sqlite3, os
src = "/home/ubuntu/Janebi-Store/data/janebi.db"
out = "/tmp/audit-bak.db"
if os.path.exists(out): os.remove(out)
s = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
d = sqlite3.connect(out)
s.backup(d)
d.close(); s.close()
c = sqlite3.connect(out)
print("products:", c.execute("select count(*) from products").fetchone())
print("users:", c.execute("select count(*) from users").fetchone())
print("orders:", c.execute("select count(*) from orders").fetchone())
print("integrity:", c.execute("pragma integrity_check").fetchone())
