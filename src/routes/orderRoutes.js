const router = require("express").Router();
const c = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { checkoutSchema, verifyPaymentSchema } = require("../validations/schemas");

router.use(protect);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Checkout - turn my cart into an order (razorpay or cod)
 *     description: For razorpay, use the returned `razorpay` object to open Razorpay Checkout, then call verify-payment.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod, shippingAddress]
 *             properties:
 *               paymentMethod: { type: string, enum: [razorpay, cod] }
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   fullName: { type: string }
 *                   phone: { type: string }
 *                   line1: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   postalCode: { type: string }
 *     responses:
 *       201: { description: Order created }
 *       409: { description: Stock problem }
 *   get:
 *     tags: [Orders]
 *     summary: List my orders
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated orders }
 */
router.post("/", validate(checkoutSchema), c.checkout);
router.get("/", c.getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get one order (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: The order }
 *       404: { description: Not found }
 */
router.get("/:id", c.getOrder);

/**
 * @swagger
 * /api/orders/{id}/verify-payment:
 *   post:
 *     tags: [Orders]
 *     summary: Verify the Razorpay payment signature and mark the order paid
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id: { type: string }
 *               razorpay_payment_id: { type: string }
 *               razorpay_signature: { type: string }
 *     responses:
 *       200: { description: Order marked paid }
 *       400: { description: Invalid signature }
 */
router.post("/:id/verify-payment", validate(verifyPaymentSchema), c.verifyPayment);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel my order (restores stock)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Cancelled order }
 *       409: { description: Too late to cancel }
 */
router.post("/:id/cancel", c.cancelMyOrder);

module.exports = router;
