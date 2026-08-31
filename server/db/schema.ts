import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  password: text('password').notNull(),
  avatar: text('avatar'),
  joinedDate: text('joined_date'),
  vipPoints: integer('vip_points').default(0),
  role: text('role').default('user')
});

export const addresses = sqliteTable('addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  province: text('province').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  postalCode: text('postal_code'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false)
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  price: integer('price').notNull(),
  originalPrice: integer('originalPrice'),
  discount: integer('discount').default(0),
  image: text('image').notNull(),
  brand: text('brand').notNull(),
  warranty: text('warranty'),
  description: text('description'),
  rating: real('rating').default(0),
  reviewsCount: integer('reviewsCount').default(0),
  stockQuantity: integer('stockQuantity').default(10).notNull(),
  sku: text('sku').unique()
});

export const productFeatures = sqliteTable('product_features', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  feature: text('feature').notNull()
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  date: text('date').notNull(),
  // Machine-readable creation time (ISO-8601) for ordering, analytics, and the
  // pending-payment reaper. `date` stays the human display string (fa-IR).
  createdAt: text('created_at'),
  status: text('status').notNull(),
  statusText: text('statusText').notNull(),
  total: integer('total').notNull(),
  subtotal: integer('subtotal').notNull(),
  shippingFee: integer('shippingFee').default(0),
  discountAmount: integer('discountAmount').default(0),
  vipPointsUsed: integer('vip_points_used').default(0),
  vipPointsEarned: integer('vip_points_earned').default(0),
  paymentMethod: text('paymentMethod').notNull(),
  shippingMethod: text('shippingMethod').notNull(),
  recipientName: text('recipientName').notNull(),
  recipientPhone: text('recipientPhone').notNull(),
  recipientAddress: text('recipientAddress').notNull(),
  recipientPostalCode: text('recipientPostalCode'),
  authority: text('authority'),
  refId: text('refId')
});

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  price: integer('price').notNull(),
  qty: integer('qty').notNull(),
  title: text('title').notNull(),
  image: text('image').notNull(),
  brand: text('brand').notNull()
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  userId: text('user_id').references(() => users.id),
  userName: text('userName').notNull(),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  comment: text('comment').notNull(),
  date: text('date').notNull(),
  isVerifiedBuyer: integer('isVerifiedBuyer', { mode: 'boolean' }).default(false),
  recommend: integer('recommend', { mode: 'boolean' }).default(false),
  helpfulCount: integer('helpfulCount').default(0),
  unhelpfulCount: integer('unhelpfulCount').default(0)
});

export const coupons = sqliteTable('coupons', {
  code: text('code').primaryKey(),
  percent: integer('percent'),
  amount: integer('amount'),
  minTotal: integer('minTotal').notNull(),
  label: text('label').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true),
  // Optional ISO-8601 expiry timestamp; null = never expires.
  expiresAt: text('expiresAt'),
  // Optional max total redemptions; null = unlimited.
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').notNull().default(0)
});

export const cartItems = sqliteTable('cart_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull().default(1),
  addedAt: integer('added_at').notNull()
});

export const wishlistItems = sqliteTable('wishlist_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  addedAt: integer('added_at').notNull()
});

export const contactMessages = sqliteTable('contact_messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message').notNull(),
  status: text('status').default('unread').notNull(),
  createdAt: text('created_at').notNull()
});

export const newsletterSubscribers = sqliteTable('newsletter_subscribers', {
  email: text('email').primaryKey(),
  subscribedAt: text('subscribed_at').notNull()
});

// Key/value store for editable shop settings (admin Settings page).
// Persisted so a container restart no longer resets them to defaults.
export const storeSettings = sqliteTable('store_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});

// Blog posts — editable by the admin, served publicly via GET /api/blog.
export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  body: text('body').notNull(), // paragraphs separated by \n\n
  image: text('image'),
  category: text('category').default('مقالات').notNull(),
  author: text('author').default('تیم جانبی آرنا').notNull(),
  readTime: text('readTime'),
  published: integer('published', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').notNull()
});

// RELATIONS
export const productsRelations = relations(products, ({ many }) => ({
  features: many(productFeatures),
  reviews: many(reviews),
}));

export const productFeaturesRelations = relations(productFeatures, ({ one }) => ({
  product: one(products, {
    fields: [productFeatures.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  cartItems: many(cartItems),
  wishlistItems: many(wishlistItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));
