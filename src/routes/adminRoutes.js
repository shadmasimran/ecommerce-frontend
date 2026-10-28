const router = require("express").Router();
const c = require("../controllers/adminController");
const { protect, authorise } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { orderStatusSchema } = require("../validations/schemas");

router.use(protect, authorise("admin"));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard - revenue, orders by status, top products, low stock
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard stats }
 *       403: { description: Admin only }
 */
router.get("/stats", c.getStats);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all orders
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: user, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated orders }
 */
router.get("/orders", c.listOrders);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Move an order forward (processing, shipped, delivered) or cancel it
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [processing, shipped, delivered, cancelled] }
 *     responses:
 *       200: { description: Updated order }
 *       409: { description: Invalid transition }
 */
router.patch("/orders/:id/status", validate(orderStatusSchema), c.updateOrderStatus);

module.exports = router;
