const Cart = require("../models/Cart");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { calcTotals } = require("../utils/pricing");
const { ok } = require("../utils/response");

// Shape the cart for the frontend: live prices, line totals, availability flags
const toView = async (cart) => {
  if (!cart) return { items: [], subtotal: 0, shippingFee: 0, total: 0 };
  await cart.populate("items.product");
  const items = cart.items
    .filter((i) => i.product) // product hard-deleted from DB (shouldn't happen: we soft delete)
    .map((i) => {
      const p = i.product;
      return {
        product: { _id: p._id, name: p.name, price: p.price, image: p.images?.[0]?.url || null, stock: p.stock },
        quantity: i.quantity,
        lineTotal: Math.round(p.price * i.quantity * 100) / 100,
        available: p.isActive && p.stock >= i.quantity,
      };
    });
  return { items, ...calcTotals(items.map((i) => ({ price: i.product.price, quantity: i.quantity }))) };
};

exports.getCart = catchAsync(async (req, res) => {
  ok(res, await toView(await Cart.findOne({ user: req.user.id })));
});

exports.addItem = catchAsync(async (req, res) => {
  const { productId, quantity } = req.body;
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new AppError("Product not found", 404);

  const cart = (await Cart.findOne({ user: req.user.id })) || new Cart({ user: req.user.id, items: [] });
  const existing = cart.items.find((i) => i.product.toString() === productId);
  const newQty = (existing?.quantity || 0) + quantity;

  if (newQty > 20) throw new AppError("Maximum 20 units of one product per order", 400);
  if (newQty > product.stock) throw new AppError(`Only ${product.stock} in stock`, 409);

  if (existing) existing.quantity = newQty;
  else cart.items.push({ product: productId, quantity });
  await cart.save();
  ok(res, await toView(cart), 201);
});

exports.updateItem = catchAsync(async (req, res) => {
  const { quantity } = req.body;
  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) throw new AppError("Product not found", 404);
  if (quantity > product.stock) throw new AppError(`Only ${product.stock} in stock`, 409);

  const cart = await Cart.findOne({ user: req.user.id });
  const item = cart?.items.find((i) => i.product.toString() === req.params.productId);
  if (!item) throw new AppError("Item not in cart", 404);

  item.quantity = quantity;
  await cart.save();
  ok(res, await toView(cart));
});

exports.removeItem = catchAsync(async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user.id },
    { $pull: { items: { product: req.params.productId } } },
    { new: true }
  );
  ok(res, await toView(cart));
});

exports.clearCart = catchAsync(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
  res.status(204).send();
});
