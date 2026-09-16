// DEV ONLY — wipe-and-seed a LOCAL database with the demo catalogue.
// Never run against prod: the boot seeder is opt-in for exactly this reason
// (SEED_DEMO_DATA=1). Real inventory: scripts/data/ingest-real-products.py.
import { db } from '../../server/db/index.js';
import * as schema from '../../server/db/schema.js';
import { 
  ALL_PRODUCTS, 
  REVIEWS_STORE,
  VALID_COUPONS,
  ALL_BRANDS
} from '../../server/data/seed-data.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Seed Products
    console.log(`Inserting ${ALL_PRODUCTS.length} products...`);
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

    // 2. Seed Reviews
    let reviewsCount = 0;
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
        reviewsCount++;
      }
    }
    console.log(`Inserted ${reviewsCount} reviews.`);

    // 3. Seed Coupons
    console.log(`Inserting coupons...`);
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

    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
