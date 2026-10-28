const Product = require("../models/Product");
const uploadService = require("../services/uploadService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const paginate = require("../utils/pagination");
const { ok } = require("../utils/response");

const SORTS = { newest: "-createdAt", price_asc: "price", price_desc: "-price" };

const buildList = async (req, res, baseFilter) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { ...baseFilter };
  const q = req.query;

  if (q.search) filter.$text = { $search: String(q.search) };
  if (q.category) filter.category = String(q.category).toLowerCase();
  if (q.inStock === "true") filter.stock = { $gt: 0 };
  if (q.minPrice || q.maxPrice) {
    filter.price = {};
    if (q.minPrice && !isNaN(q.minPrice)) filter.price.$gte = Number(q.minPrice);
    if (q.maxPrice && !isNaN(q.maxPrice)) filter.price.$lte = Number(q.maxPrice);
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(SORTS[q.sort] || SORTS.newest).skip(skip).limit(limit),
  ]);
  ok(res, products, 200, { total, totalPages: Math.ceil(total / limit), currentPage: page });
};

// Public: only active products
exports.getProducts = catchAsync((req, res) => buildList(req, res, { isActive: true }));

// Admin: includes inactive products
exports.getAllProductsAdmin = catchAsync((req, res) => buildList(req, res, {}));

exports.getProduct = catchAsync(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) throw new AppError("Product not found", 404);
  ok(res, product);
});

exports.createProduct = catchAsync(async (req, res) => {
  const product = await Product.create({ ...req.body, createdBy: req.user.id });
  ok(res, product, 201);
});

exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw new AppError("Product not found", 404);
  ok(res, product);
});

// Soft delete: hides the product from the shop but keeps it for existing orders
exports.deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new AppError("Product not found", 404);
  res.status(204).send();
});

exports.addImages = catchAsync(async (req, res) => {
  if (!req.files?.length) throw new AppError("No images provided (field name: 'images')", 400);
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  if (product.images.length + req.files.length > 8) throw new AppError("A product can have at most 8 images", 400);

  const results = await Promise.all(req.files.map((f) => uploadService.uploadBuffer(f.buffer, "products")));
  product.images.push(...results.map((r) => ({ url: r.secure_url, publicId: r.public_id })));
  await product.save();
  ok(res, product);
});
