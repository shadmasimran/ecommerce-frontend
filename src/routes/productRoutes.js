const router = require("express").Router();
const c = require("../controllers/productController");
const { protect, authorise } = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");
const { createProductSchema, updateProductSchema } = require("../validations/schemas");

const admin = [protect, authorise("admin")];

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List active products (public) with search, filters, sorting, pagination
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: inStock, schema: { type: boolean } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, price_asc, price_desc] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated products }
 *   post:
 *     tags: [Products]
 *     summary: Create a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, stock, category]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               category: { type: string }
 *     responses:
 *       201: { description: Created }
 *       403: { description: Admin only }
 */
router.get("/", c.getProducts);
router.post("/", ...admin, validate(createProductSchema), c.createProduct);

/**
 * @swagger
 * /api/products/admin/all:
 *   get:
 *     tags: [Products]
 *     summary: List ALL products including inactive (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated products }
 */
router.get("/admin/all", ...admin, c.getAllProductsAdmin);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get one active product
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: The product }
 *       404: { description: Not found }
 *   put:
 *     tags: [Products]
 *     summary: Update a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Products]
 *     summary: Deactivate a product (admin, soft delete)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deactivated }
 */
router.get("/:id", c.getProduct);
router.put("/:id", ...admin, validate(updateProductSchema), c.updateProduct);
router.delete("/:id", ...admin, c.deleteProduct);

/**
 * @swagger
 * /api/products/{id}/images:
 *   post:
 *     tags: [Products]
 *     summary: Upload up to 5 images for a product (admin, Cloudinary)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       200: { description: Product with images }
 */
router.post("/:id/images", ...admin, upload.array("images", 5), c.addImages);

module.exports = router;
