import { app } from './app.js';
import { env } from './env.js';
import { db, dbReady } from './db/index.js';
import * as schema from './db/schema.js';
import { startBaleBot } from './bot/bale.js';
import { ALL_PRODUCTS, REVIEWS_STORE, VALID_COUPONS } from './data/seed-data.js';
import { blogPostingJsonLdFor, productJsonLdFor, breadcrumbJsonLdFor, injectBreadcrumbIntoHtml } from "./lib/breadcrumbs.js";
import express from 'express';
import path from 'path';
import fs from 'fs';

async function ensureDatabaseInitialized() {
  try {
    // Wait for dialect-specific migrations (PG) to finish before seeding.
    await dbReady();

    // Read and run migration SQL if needed
    const migrationFile = path.resolve(process.cwd(), 'drizzle/0000_absurd_night_nurse.sql');
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, 'utf-8');
      const statements = sql.split('--> statement-breakpoint');
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          try {
            (db as any).session.client.exec(trimmed);
          } catch (e) {
            // Ignore table/index already exists errors
          }
        }
      }
    }

    // Check if products exist, otherwise seed
    const existingProducts = await db.select().from(schema.products).limit(1);
    if (existingProducts.length === 0) {
      console.log('🌱 Seeding fresh database...');
      for (const p of ALL_PRODUCTS) {
        await db.insert(schema.products).values({
          id: p.id,
          title: p.title,
          category: p.category,
          price: p.price,
          originalPrice: p.originalPrice,
          discount: p.discount,
          image: p.image,
          brand: p.brand,
          warranty: p.warranty,
          description: p.description,
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          stockQuantity: (p as any).stockQuantity ?? (p.inStock ? 10 : 0),
          sku: p.sku
        }).onConflictDoNothing();

        if (p.features && p.features.length > 0) {
          for (const feature of p.features) {
            await db.insert(schema.productFeatures).values({
              productId: p.id,
              feature
            }).onConflictDoNothing();
          }
        }
      }

      for (const [productId, reviews] of Object.entries(REVIEWS_STORE)) {
        for (const review of reviews) {
          await db.insert(schema.reviews).values({
            id: review.id,
            productId: parseInt(productId),
            userName: review.userName,
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            date: review.date,
            isVerifiedBuyer: review.isVerifiedBuyer,
            recommend: review.recommend,
            helpfulCount: review.helpfulCount,
            unhelpfulCount: review.unhelpfulCount
          }).onConflictDoNothing();
        }
      }

      for (const [code, data] of Object.entries(VALID_COUPONS)) {
        await db.insert(schema.coupons).values({
          code,
          percent: data.percent,
          amount: data.amount,
          minTotal: data.minTotal,
          label: data.label,
          active: true
        }).onConflictDoNothing();
      }
      console.log('✅ Initial database seed completed!');
    }
  } catch (err) {
    console.error('Database initialization warning/error:', err);
  }
}

async function startServer() {
  await ensureDatabaseInitialized();

  if (env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const fs = await import('fs');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.use(async (req: any, res: any, next: any) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const crumb = await breadcrumbJsonLdFor(req.originalUrl.split('?')[0]);
        template = injectBreadcrumbIntoHtml(template, crumb);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", async (req, res) => {
      try {
        const shell = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        const pathname = req.originalUrl.split("?")[0];
        const [crumb, postingLd, productLd] = await Promise.all([
          breadcrumbJsonLdFor(pathname),
          blogPostingJsonLdFor(pathname),
          productJsonLdFor(pathname),
        ]);
        // Structured JSON-LD only differs on /blog and /product routes; avoid
        // re-reading on every request by falling back to a plain sendFile.
        const structuredLd = [crumb, postingLd, productLd].filter(Boolean).join("\n");
        if (!structuredLd) return res.sendFile(path.join(distPath, "index.html"));
        return res
          .status(200)
          .set("Content-Type", "text/html")
          .send(injectBreadcrumbIntoHtml(shell, structuredLd));
      } catch {
        return res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  const PORT = env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
  });

  // Bale bot (product upload) — starts only when BALE_BOT_TOKEN is set.
  if (env.BALE_BOT_TOKEN) {
    startBaleBot(env.BALE_BOT_TOKEN, env.BALE_ADMIN_CHAT_IDS).catch((e) =>
      console.error('❌ Bale bot failed to start:', e.message)
    );
  }
}

startServer().catch(console.error);
