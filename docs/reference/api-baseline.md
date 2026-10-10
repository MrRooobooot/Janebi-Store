# API Baseline Inventory — Janebi-Store

This inventory documents all REST API endpoints currently implemented in the Express backend.

---

## 1. Authentication Endpoints (`server/routes/auth.ts`)

### `POST /api/auth/register`
- **Auth Required:** No
- **Role:** Public
- **Request Body:** `{ name: string, phone: string (09xxxxxxxxx), password: string (min 6) }`
- **Response:** `201 Created` → `{ message: string, user: UserObject, accessToken: string, refreshToken: string }`
- **Database Effect:** Inserts row into `users` table.
- **Side Effect:** Generates signed JWT access token (1d) and refresh token (7d).

### `POST /api/auth/login`
- **Auth Required:** No
- **Role:** Public
- **Request Body:** `{ phone: string, password: string }`
- **Response:** `200 OK` → `{ message: string, user: UserObject, accessToken: string, refreshToken: string }`
- **Database Effect:** Queries `users` and `addresses` tables.
- **Side Effect:** Verifies bcrypt hash; generates JWT tokens.

### `GET /api/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Role:** Authenticated user
- **Request:** None
- **Response:** `200 OK` → `{ user: UserObjectWithAddresses }`
- **Database Effect:** Queries `users` and `addresses` by decoded `userId`.
- **Side Effect:** None.

### `POST /api/auth/send-otp`
- **Auth Required:** No
- **Role:** Public
- **Request Body:** `{ phone: string }`
- **Response:** `200 OK` → `{ message: "کد تایید ارسال شد" }`
- **Database Effect:** None (In-memory storage `otpStore`).
- **Side Effect:** Logs mock SMS OTP code to stdout.

### `POST /api/auth/verify-otp`
- **Auth Required:** No
- **Role:** Public
- **Request Body:** `{ phone: string, code: string, name?: string }`
- **Response:** `200 OK` → `{ message: string, user: UserObject, accessToken: string, refreshToken: string }`
- **Database Effect:** Upserts / inserts user if not found in `users` table; queries `addresses`.
- **Side Effect:** Clears OTP from cache; issues JWT tokens.

### `POST /api/auth/refresh`
- **Auth Required:** No (requires refresh token in body)
- **Role:** Public
- **Request Body:** `{ refreshToken: string }`
- **Response:** `200 OK` → `{ accessToken: string, refreshToken: string }`
- **Database Effect:** None.
- **Side Effect:** Verifies JWT refresh secret signature.

---

## 2. Product Catalog Endpoints (`server/routes/products.ts`, `categories.ts`, `brands.ts`)

### `GET /api/products`
- **Auth Required:** No
- **Role:** Public
- **Query Params:** `category`, `search`, `limit`, `brands`, `minPrice`, `maxPrice`, `inStock`, `hasDiscount`, `sort`, `page`
- **Response:** `200 OK` → `Product[]` + Headers: `X-Total-Count`, `X-Total-Pages`, `X-Current-Page`
- **Database Effect:** Select query on `products` with joins on `product_features`.
- **Side Effect:** None.

### `GET /api/products/:id`
- **Auth Required:** No
- **Role:** Public
- **Path Params:** `id: number`
- **Response:** `200 OK` → `Product` with `features: string[]` and `reviews: Review[]`
- **Database Effect:** Select query on `products`, `product_features`, and `reviews`.
- **Side Effect:** None.

### `POST /api/products/:id/reviews`
- **Auth Required:** Optional / Authenticated
- **Role:** Public / User
- **Path Params:** `id: number`
- **Request Body:** `{ rating: number (1-5), title: string, comment: string, userName: string, recommend?: boolean }`
- **Response:** `201 Created` → `{ message: string, review: ReviewObject }`
- **Database Effect:** Inserts row into `reviews` table; updates `rating` and `reviewsCount` on `products`.
- **Side Effect:** None.

### `GET /api/categories`
- **Auth Required:** No
- **Role:** Public
- **Response:** `200 OK` → `{ name: string, count: number }[]`
- **Database Effect:** Group-by query on `products.category`.
- **Side Effect:** None.

### `GET /api/brands`
- **Auth Required:** No
- **Role:** Public
- **Response:** `200 OK` → `string[]` (All brands)
- **Database Effect:** In-memory static brand catalog list.
- **Side Effect:** None.

---

## 3. Order & Checkout Endpoints (`server/routes/orders.ts`)

### `POST /api/orders`
- **Auth Required:** Optional (supports guest and authenticated checkout)
- **Role:** Public / User
- **Request Body:**
  ```json
  {
    "userId": "string (optional)",
    "items": [{ "productId": 1, "qty": 2, "price": 500000, "title": "...", "image": "...", "brand": "..." }],
    "shippingAddress": { "fullName": "...", "phone": "...", "province": "...", "city": "...", "address": "...", "postalCode": "..." },
    "shippingMethod": "express | standard",
    "paymentMethod": "online | cod",
    "couponCode": "string (optional)"
  }
  ```
- **Response:** `201 Created` → `{ message: string, orderId: string, total: number }`
- **Database Effect:** Transactional write: inserts `orders`, inserts `order_items`, and deducts `stockQuantity` from `products`.
- **Side Effect:** Validates and applies coupon discounts.

### `GET /api/orders/user/:userId`
- **Auth Required:** Yes
- **Role:** Authenticated owner or Admin
- **Response:** `200 OK` → `Order[]` with attached `items: OrderItem[]`
- **Database Effect:** Queries `orders` and `order_items` filtered by `userId`.
- **Side Effect:** None.

### `GET /api/orders/:id`
- **Auth Required:** Yes
- **Role:** Authenticated owner or Admin
- **Response:** `200 OK` → `Order` with `items: OrderItem[]`
- **Database Effect:** Queries `orders` and `order_items` filtered by `id`.
- **Side Effect:** None.

---

## 4. Payment Gateway Endpoints (`server/routes/payment.ts`)

### `POST /api/payment/request`
- **Auth Required:** No
- **Role:** Public
- **Request Body:** `{ orderId: string }`
- **Response:** `200 OK` → `{ paymentUrl: string, authority: string }`
- **Database Effect:** Updates `orders.authority` with Zarinpal tracking code.
- **Side Effect:** Dispatches HTTP request to Zarinpal `PaymentRequest.json`.

### `GET /api/payment/verify`
- **Auth Required:** No (Zarinpal callback endpoint)
- **Role:** Public callback
- **Query Params:** `Authority: string`, `Status: string (OK | NOK)`
- **Response:** `302 Redirect` → Redirects browser to `/checkout/callback?status=success|failed&orderId=...`
- **Database Effect:**
  - On Success: Updates `orders.status` to `processing` and stores `refId`.
  - On Failure: Restores product inventory in `products.stockQuantity` and sets status to `cancelled`.
- **Side Effect:** Dispatches HTTP request to Zarinpal `PaymentVerification.json`.

---

## 5. Cart & Wishlist Endpoints (`server/routes/cart.ts`, `wishlist.ts`)

### `GET /api/cart`
- **Auth Required:** Yes
- **Response:** `200 OK` → `CartItem[]` with nested `product: Product`
- **Database Effect:** Select query on `cart_items` joined with `products`.

### `POST /api/cart`
- **Auth Required:** Yes
- **Request Body:** `{ productId: number, quantity: number }`
- **Response:** `200 OK` → `{ message: string, item: CartItem }`
- **Database Effect:** Upserts item in `cart_items`.

### `PUT /api/cart/:id`
- **Auth Required:** Yes
- **Request Body:** `{ quantity: number }`
- **Response:** `200 OK` → Updated CartItem
- **Database Effect:** Updates `cart_items.quantity`.

### `DELETE /api/cart/:id`
- **Auth Required:** Yes
- **Response:** `200 OK` → `{ message: "Item removed" }`
- **Database Effect:** Deletes row from `cart_items`.

### `DELETE /api/cart`
- **Auth Required:** Yes
- **Response:** `200 OK` → `{ message: "Cart cleared" }`
- **Database Effect:** Deletes all rows for `userId` in `cart_items`.

### `GET /api/wishlist`
- **Auth Required:** Yes
- **Response:** `200 OK` → `WishlistItem[]` with nested `product: Product`
- **Database Effect:** Select query on `wishlist_items` joined with `products`.

### `POST /api/wishlist`
- **Auth Required:** Yes
- **Request Body:** `{ productId: number }`
- **Response:** `200 OK` → `{ message: string, action: "added" | "removed" }`
- **Database Effect:** Toggles presence in `wishlist_items`.

### `DELETE /api/wishlist/:productId`
- **Auth Required:** Yes
- **Response:** `200 OK` → `{ message: "Removed from wishlist" }`
- **Database Effect:** Deletes row in `wishlist_items`.

---

## 6. User Profile & Address Book (`server/routes/users.ts`)

### `PUT /api/users/profile`
- **Auth Required:** Yes
- **Request Body:** `{ name?: string, email?: string, avatar?: string }`
- **Response:** `200 OK` → Updated User object.
- **Database Effect:** Updates `users` row.

### `POST /api/users/addresses`
- **Auth Required:** Yes
- **Request Body:** `{ title: string, name: string, phone: string, province: string, city: string, address: string, postalCode?: string, isDefault?: boolean }`
- **Response:** `201 Created` → Created Address object.
- **Database Effect:** Inserts row into `addresses`; if `isDefault`, unsets other default addresses for user.

### `PUT /api/users/addresses/:id`
- **Auth Required:** Yes
- **Response:** `200 OK` → Updated Address object.
- **Database Effect:** Updates `addresses` row.

### `DELETE /api/users/addresses/:id`
- **Auth Required:** Yes
- **Response:** `200 OK` → `{ message: "Address deleted" }`
- **Database Effect:** Deletes `addresses` row.

### `PUT /api/users/addresses/:id/default`
- **Auth Required:** Yes
- **Response:** `200 OK` → `{ message: "Default address updated" }`
- **Database Effect:** Transactional update toggling `isDefault` flag across user addresses.

---

## 7. Coupons & Promotions (`server/routes/coupons.ts`)

### `GET /api/coupons/validate`
- **Auth Required:** No
- **Query Params:** `code: string`, `total: number`
- **Response:** `200 OK` → `{ valid: true, discountAmount: number, code: string, percent?: number, amount?: number, label: string }`
- **Database Effect:** Select query on `coupons` table.

---

## 8. Admin Management Endpoints (`server/routes/admin.ts`)

All endpoints in this group strictly require `authenticate` middleware and `req.user.role === 'admin'`.

| Method | Path | Description | Database Effect |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Overall KPIs (Revenue, Orders, Products, Users) | Aggregation queries across `orders`, `products`, `users` |
| `GET` | `/api/admin/products` | Paginated product list with stock & filters | Select on `products` |
| `POST` | `/api/admin/products` | Create new product and features | Insert `products` and `product_features` |
| `PUT` | `/api/admin/products/:id` | Update product fields and features | Update `products`, rewrite `product_features` |
| `DELETE` | `/api/admin/products/:id` | Delete product | Delete `products` |
| `GET` | `/api/admin/orders` | List all orders with line items | Select on `orders` and `order_items` |
| `PUT` | `/api/admin/orders/:id/status`| Update order status (`processing`, `shipped`, etc.) | Update `orders.status` |
| `GET` | `/api/admin/users` | List all registered users | Select on `users` |
| `GET` | `/api/admin/coupons` | List all discount coupons | Select on `coupons` |
| `POST` | `/api/admin/coupons` | Create new discount coupon | Insert `coupons` |
| `DELETE` | `/api/admin/coupons/:code` | Delete discount coupon | Delete `coupons` |
