# E-commerce Backend API (Level 3)

Express + MongoDB (Mongoose) backend: products, cart, checkout, Razorpay payments, order management and an admin dashboard.

## Setup

```bash
npm install
copy .env.example .env        # Windows (use cp on Mac/Linux), then edit .env
npm run seed                  # creates an admin user + 8 sample products
npm run dev
```

- Swagger docs: http://localhost:3000/api-docs
- Razorpay keys are optional: without them use `"paymentMethod": "cod"`. For online payments use **test mode** keys.
- Cloudinary keys are only needed for product image upload.

## Endpoints

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`, `PATCH /api/auth/users/:id/role` (admin) |
| Products | `GET /api/products` (search, category, minPrice, maxPrice, inStock, sort, page, limit), `GET /:id`; admin: `POST`, `PUT /:id`, `DELETE /:id` (soft delete), `POST /:id/images`, `GET /admin/all` |
| Cart | `GET /api/cart`, `POST /items`, `PATCH /items/:productId`, `DELETE /items/:productId`, `DELETE /api/cart` |
| Orders | `POST /api/orders` (checkout), `GET /api/orders`, `GET /:id`, `POST /:id/verify-payment`, `POST /:id/cancel` |
| Admin | `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`, `GET /api/admin/stats` |

## Test flow (Swagger or Postman)

1. Login as the seeded admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`) and Authorize with the token.
2. `GET /api/products`, copy a product `_id`.
3. Register a normal user, log in, authorize as that user.
4. `POST /api/cart/items` with `{ "productId": "...", "quantity": 2 }`, then `GET /api/cart`.
5. `POST /api/orders` with `paymentMethod: "cod"` and a shipping address. Stock drops, the cart empties.
6. As admin: `PATCH /api/admin/orders/:id/status` with `processing`, `shipped`, `delivered`, then check `GET /api/admin/stats`.
7. Try to break it: order more than the stock (409), cancel an order (stock comes back), call an admin route with the user token (403), jump `processing` to `delivered` (409).

### Razorpay flow (test mode)

1. Checkout with `paymentMethod: "razorpay"`. The response includes `razorpay: { orderId, amount, currency, keyId }`.
2. The frontend opens Razorpay Checkout with those values.
3. Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. Send them to `POST /api/orders/:id/verify-payment`.
4. The server recomputes the HMAC signature. Only a valid one marks the order `paid`.

## How it stays correct

- **Prices come from the database**, never from the request body.
- **Stock is reserved at checkout** with atomic conditional updates (`stock >= qty` inside the query), so two buyers can't oversell the last item. If any line fails or payment setup fails, earlier reservations are rolled back. This works on a standalone MongoDB (no transactions needed).
- **Status changes are compare-and-set**: the expected current status is part of the update query, so cancel vs. payment vs. admin updates can't both win.
- **Unpaid online orders expire after 30 minutes** (job runs every 5 min) and their stock is released.
- **Orders store a snapshot** of name/price/image, so later price edits don't rewrite history. Products are soft-deleted for the same reason.
- **COD counts as revenue only once delivered.**
- Other users' orders return 404, not 403.

## Known limits (good next steps)

- No Razorpay **webhook**: if a customer pays but closes the browser before `verify-payment`, the order stays unpaid until it expires. A webhook for `payment.captured` fixes that.
- Refunds are flagged (`payment.status = refund_pending`) but not issued through the Razorpay API.
- No email notifications yet (the guide's Nodemailer module would slot into `orderService`).
- Prices are stored as rupees (Number). Production systems often store integer paise.

## Deploying

Render: build `npm install`, start `npm start`. Set all `.env` values in the dashboard, use MongoDB Atlas for `MONGO_URI`, `NODE_ENV=production`, and `FRONTEND_URL` to your frontend.
