const router = require("express").Router();
const c = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { addToCartSchema, updateCartItemSchema } = require("../validations/schemas");

router.use(protect);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get my cart with live prices and totals
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Cart view }
 *   delete:
 *     tags: [Cart]
 *     summary: Empty my cart
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Cleared }
 */
router.get("/", c.getCart);
router.delete("/", c.clearCart);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add a product to my cart
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *               quantity: { type: integer, default: 1 }
 *     responses:
 *       201: { description: Updated cart }
 *       409: { description: Not enough stock }
 */
router.post("/items", validate(addToCartSchema), c.addItem);

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Set the quantity of a cart item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: productId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer }
 *     responses:
 *       200: { description: Updated cart }
 *   delete:
 *     tags: [Cart]
 *     summary: Remove an item from my cart
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: productId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated cart }
 */
router.patch("/items/:productId", validate(updateCartItemSchema), c.updateItem);
router.delete("/items/:productId", c.removeItem);

module.exports = router;
