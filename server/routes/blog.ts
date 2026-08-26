import { Router } from "express";
import { db } from "../db/index.js";
import { blogPosts } from "../db/schema.js";
import { desc, eq, asc } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public: list published posts (newest first)
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.createdAt));
    res.json(rows);
  } catch (error) {
    console.error("Blog list error:", error);
    res.status(500).json({ message: "خطای سرور در دریافت مقالات" });
  }
});

// Admin: full CRUD
const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    res.json(rows);
  } catch (error) {
    console.error("Blog admin list error:", error);
    res.status(500).json({ message: "خطای سرور" });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { title, excerpt, body, image, category, author, readTime } = req.body || {};
    if (!title?.trim() || !excerpt?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "عنوان، خلاصه و متن مقاله الزامی است" });
    }
    const row = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(title).slice(0, 300),
      excerpt: String(excerpt).slice(0, 1000),
      body: String(body),
      image: image ? String(image) : null,
      category: category ? String(category).slice(0, 80) : "مقالات",
      author: author ? String(author).slice(0, 120) : "تیم جانبی آرنا",
      readTime: readTime ? String(readTime).slice(0, 40) : null,
      published: true,
      createdAt: new Date().toISOString(),
    };
    await db.insert(blogPosts).values(row);
    res.status(201).json(row);
  } catch (error) {
    console.error("Blog create error:", error);
    res.status(500).json({ message: "خطا در ایجاد مقاله" });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const { title, excerpt, body, image, category, author, readTime, published } = req.body || {};
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = String(title).slice(0, 300);
    if (excerpt !== undefined) updates.excerpt = String(excerpt).slice(0, 1000);
    if (body !== undefined) updates.body = String(body);
    if (image !== undefined) updates.image = image ? String(image) : null;
    if (category !== undefined) updates.category = String(category).slice(0, 80);
    if (author !== undefined) updates.author = String(author).slice(0, 120);
    if (readTime !== undefined) updates.readTime = readTime ? String(readTime) : null;
    if (published !== undefined) updates.published = Boolean(published);
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "چیزی برای بروزرسانی ارسال نشده است" });
    }
    await db.update(blogPosts).set(updates).where(eq(blogPosts.id, req.params.id));
    const updated = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, req.params.id) });
    if (!updated) return res.status(404).json({ message: "مقاله یافت نشد" });
    res.json(updated);
  } catch (error) {
    console.error("Blog update error:", error);
    res.status(500).json({ message: "خطا در بروزرسانی مقاله" });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id));
    res.json({ message: "مقاله حذف شد" });
  } catch (error) {
    console.error("Blog delete error:", error);
    res.status(500).json({ message: "خطا در حذف مقاله" });
  }
});

router.use("/admin", adminRouter);

export default router;
