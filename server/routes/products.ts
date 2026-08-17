import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { productQuerySchema, idParamSchema, reviewSubmitSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { products, reviews } from '../db/schema.js';
import { eq, or, like, and, SQL, sql, gte, lte, gt, inArray, desc, asc } from 'drizzle-orm';

const router = Router();

router.get('/', validate(productQuerySchema), async (req, res) => {
  const { category, search, limit, brands, minPrice, maxPrice, inStock, hasDiscount, sort, page } = req.query as any;
  
  const conditions: SQL[] = [];
  
  if (category && category !== 'همه') {
    conditions.push(eq(products.category, category));
  }
  
  if (search) {
    const s = `%${search}%`;
    conditions.push(or(
      like(products.title, s),
      like(products.category, s),
      like(products.brand, s)
    )!);
  }
  
  if (brands) {
    const brandArray = brands.split(',');
    if (brandArray.length > 0) {
      conditions.push(inArray(products.brand, brandArray));
    }
  }

  if (minPrice) {
    conditions.push(gte(products.price, parseInt(minPrice)));
  }

  if (maxPrice) {
    conditions.push(lte(products.price, parseInt(maxPrice)));
  }

  if (inStock === 'true') {
    conditions.push(gt(products.stockQuantity, 0));
  }

  if (hasDiscount === 'true') {
    conditions.push(gt(products.discount, 0));
  }

  const finalCondition = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy: any = desc(products.id);
  if (sort) {
    switch (sort) {
      case 'price-asc':
        orderBy = asc(products.price);
        break;
      case 'price-desc':
        orderBy = desc(products.price);
        break;
      case 'popular':
        orderBy = desc(products.rating);
        break;
      case 'newest':
      default:
        orderBy = desc(products.id);
        break;
    }
  }

  const pageSize = limit ? parseInt(limit) : 20; // Default limit
  const currentPage = page ? parseInt(page) : 1;
  const offset = (currentPage - 1) * pageSize;

  const results = await db.query.products.findMany({
    where: finalCondition,
    limit: pageSize,
    offset,
    orderBy,
    with: {
      features: true
    }
  });

  // Calculate total count using proper SQL count to avoid memory leaks
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(products).where(finalCondition);
  const total = Number(count);
  const totalPages = Math.ceil(total / pageSize);

  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Total-Pages', totalPages.toString());
  res.setHeader('X-Current-Page', currentPage.toString());
  
  const formatted = results.map(p => ({
    ...p,
    features: p.features.map(f => f.feature)
  }));
  
  res.json(formatted);
});

router.get('/:id/reviews', validate(idParamSchema), async (req, res) => {
  const productId = parseInt(req.params.id as string);
  
  const productReviews = await db.query.reviews.findMany({
    where: eq(reviews.productId, productId)
  });
  
  res.json(productReviews);
});

router.post('/:id/reviews', validate(reviewSubmitSchema), async (req, res) => {
  const productId = parseInt(req.params.id as string);

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId)
  });

  if (!product) {
    return res.status(404).json({ message: 'محصول یافت نشد' });
  }

  const { userName, rating, title, comment, recommend } = req.body;

  const newReview = {
    id: `rev-${Date.now()}`,
    productId,
    userName,
    rating,
    title,
    comment,
    recommend,
    date: new Date().toISOString().split('T')[0],
    isVerifiedBuyer: false,
    helpfulCount: 0,
    unhelpfulCount: 0
  };

  await db.insert(reviews).values(newReview);
  
  res.status(201).json(newReview);
});

router.get('/:id', validate(idParamSchema), async (req, res) => {
  const id = parseInt(req.params.id as string);
  
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      features: true
    }
  });
  
  if (product) {
    const formatted = {
      ...product,
      features: product.features.map(f => f.feature)
    };
    res.json(formatted);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
});

export default router;
