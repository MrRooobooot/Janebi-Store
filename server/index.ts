import { app } from './app.js';
import { env } from './env.js';
import { db, dbReady } from './db/index.js';
import * as schema from './db/schema.js';
import { startBaleBot } from './bot/bale.js';
import { storeEvents } from './services/events.js';
import { sendOrderReceiptSms } from './services/sms.js';
import { ALL_PRODUCTS, REVIEWS_STORE, VALID_COUPONS } from './data/seed-data.js';
import { blogPostingJsonLdFor, productJsonLdFor, breadcrumbJsonLdFor, productBreadcrumbJsonLdFor, injectBreadcrumbIntoHtml } from "./lib/breadcrumbs.js";
import { routeMetaForRequest, injectSeoMetadata, productOgImageFor } from "./lib/seoMeta.js";
import { shouldNoIndex } from "./lib/robots.js";
import { LEGACY_PRODUCT_REDIRECTS } from "./data/legacyProductRedirects.js";
import { eq } from "drizzle-orm";
import express from 'express';
import path from 'path';
import fs from 'fs';

async function ensureDatabaseInitialized() {
  try {
    // Wait for dialect-specific migrations (PG) to finish before seeding.
    await dbReady();

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
    const publicImages = path.join(process.cwd(), "public", "images");
    app.use("/images", express.static(publicImages));
    app.use(express.static(distPath, { redirect: false }));
    app.get("/{*splat}", async (req, res) => {
      try {
        const shell = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        const [pathname, search] = req.originalUrl.split("?");
        const query = new URLSearchParams(search || "");

        // SEO-001b: products removed in the catalogue cleanup 301 to the hub — Google
        // already has these URLs; a permanent redirect keeps their signals alive.
        const productMatch = pathname.match(/^\/products?\/(\d+)\/?$/);
        if (productMatch) {
          const pid = Number(productMatch[1]);
          const legacy = LEGACY_PRODUCT_REDIRECTS[pid];
          if (legacy) return res.redirect(301, legacy);

          // SEO-001: Return authentic 404 for nonexistent product IDs rather than a Soft 404
          const exists = await db.query.products.findFirst({
            where: eq(schema.products.id, pid),
          });
          if (!exists) return sendNotFound(res, shell);
        }

        // SEO-004: Authentic 404 for any non-route path. The SPA route table is
        // mirrored here so that unknown paths (/nonexistent-xyz, scanners, old
        // links) return HTTP 404 + noindex instead of an indexable Soft 404.
        const SPA_ROUTES = new Set([
          "/", "/products", "/cart", "/checkout", "/checkout/callback",
          "/wishlist", "/compare", "/profile", "/login", "/register",
          "/force-change-password", "/about", "/contact", "/terms",
          "/privacy", "/faq", "/blog", "/offers", "/new-products", "/brands",
          "/admin", "/admin/products", "/admin/orders", "/admin/reviews",
          "/admin/users", "/admin/coupons", "/admin/messages",
          "/admin/newsletter", "/admin/audit-logs", "/admin/settings",
        ]);
        const productRoute =
          /^\/products?\/\d+\/?$/.test(pathname) ||
          /^\/blog\/[^/]+\/?$/.test(pathname) ||
          /^\/admin\/[a-z-]+\/?$/.test(pathname);
        if (!productRoute && !SPA_ROUTES.has(pathname)) {
          return sendNotFound(res, shell);
        }

        const [crumb, postingLd, productLd, meta, productImage, productCrumb] = await Promise.all([
          breadcrumbJsonLdFor(pathname),
          blogPostingJsonLdFor(pathname),
          productJsonLdFor(pathname),
          routeMetaForRequest(pathname, query),
          productOgImageFor(pathname),
          productBreadcrumbJsonLdFor(pathname),
        ]);
        // Structured JSON-LD only differs on /blog and /product routes; avoid
        // re-reading on every request by falling back to a plain sendFile.
        const structuredLd = [crumb, postingLd, productLd, productCrumb].filter(Boolean).join("\n");
        // No route metadata → cheapest path, but the robots meta still has to match the
        // X-Robots-Tag the middleware already sent (this early return used to ship the
        // pristine shell with index,follow on noindex routes like /cart and /login).
        if (!structuredLd && !meta) {
          return res.set("Content-Type", "text/html").send(applyNoIndexMeta(shell, pathname, query));
        }
        let html = applyNoIndexMeta(shell, pathname, query);
        if (structuredLd) html = injectBreadcrumbIntoHtml(html, structuredLd);
        if (meta) html = injectSeoMetadata(html, productImage ? { ...meta, ogImage: productImage.og, preloadImage: productImage.hero } : meta);
        return res
          .status(200)
          .set("Content-Type", "text/html")
          .send(html);
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

  // Order receipt SMS to the buyer. Same event the owner bot listens to, so both
  // COD and verified online payments get a receipt; failures never touch the order.
  storeEvents.on('order:paid', (event) => {
    void sendOrderReceiptSms({
      orderId: event.orderId,
      total: event.total,
      recipientPhone: event.recipientPhone,
    });
  });
}


/**
 * Serve the SPA shell as a genuine 404. The HTTP status is the indexing signal, so no
 * X-Robots-Tag is sent (that made GSC report deleted URLs under "Excluded by noindex"
 * instead of "Not found"); the shell's own index,follow meta is swapped for noindex so
 * header and body never contradict each other.
 */
/** Swap the shell's robots meta for noindex on routes the header already marks noindex. */
function applyNoIndexMeta(html: string, pathname: string, query: URLSearchParams): string {
  return shouldNoIndex(pathname, query)
    ? html.replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow" />')
    : html;
}

function sendNotFound(res: import("express").Response, shell: string) {
  const html = shell
    .replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow" />')
    .replace(/<link[^>]*rel="canonical"[^>]*>\s*/gi, "");
  return res.status(404).set({ "Content-Type": "text/html", "X-Robots-Tag": "noindex, nofollow" }).send(html);
}

startServer().catch(console.error);
