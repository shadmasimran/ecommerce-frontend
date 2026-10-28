const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const orderService = require("../services/orderService");
const razorpay = require("../services/razorpayService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const paginate = require("../utils/pagination");
const { calcTotals } = require("../utils/pricing");
const { ok } = require("../utils/response");

// ---- Checkout: cart -> order -------------------------------------------------
// Prices always come from the DB, never from the client.
// Stock is reserved with atomic conditional updates (works on a standalone MongoDB, no transactions needed).
exports.checkout = catchAsync(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
  if (!cart || cart.items.length === 0) throw new AppError("Your cart is empty", 400);

  for (const i of cart.items) {
    if (!i.product || !i.product.isActive) throw new AppError("A product in your cart is no longer available", 409);
    if (i.product.stock < i.quantity) throw new AppError(`Not enough stock for "${i.product.name}"`, 409);
  }

  const lines = cart.items.map((i) => ({
    product: i.product._id,
    name: i.product.name,
    price: i.product.price,
    quantity: i.quantity,
    image: i.product.images?.[0]?.url || null,
  }));
  const totals = calcTotals(lines);

  // 1) Reserve stock atomically; if any line fails, undo the ones that succeeded
  const reserved = [];
  try {
    for (const l of lines) {
      const r = await Product.updateOne(
        { _id: l.product, isActive: true, stock: { $gte: l.quantity } },
        { $inc: { stock: -l.quantity } }
      );
      if (r.modifiedCount !== 1) throw new AppError(`"${l.name}" just sold out or changed`, 409);
      reserved.push(l);
    }
  } catch (err) {
    await orderService.restoreStock(reserved);
    throw err;
  }

  // 2) Create the order (and the Razorpay order for online payments)
  const orderId = new mongoose.Types.ObjectId();
  const doc = {
    _id: orderId,
    user: req.user.id,
    items: lines,
    shippingAddress,
    ...totals,
    paymentMethod,
  };
  let rzp = null;

  try {
    if (paymentMethod === "razorpay") {
      rzp = await razorpay.createOrder({
        amountPaise: Math.round(totals.total * 100),
        receipt: orderId.toString(),
      });
      doc.payment = { status: "pending", razorpayOrderId: rzp.id };
      doc.status = "pending_payment";
    } else {
      doc.payment = { status: "cod" };
      doc.status = "processing";
    }
    const order = await Order.create(doc);
    await Cart.updateOne({ user: req.user.id }, { items: [] });

    ok(res, order, 201, rzp ? {
      razorpay: { orderId: rzp.id, amount: rzp.amount, currency: rzp.currency, keyId: process.env.RAZORPAY_KEY_ID },
    } : {});
  } catch (err) {
    await orderService.restoreStock(lines); // payment provider / DB failed -> release the reservation
    throw err instanceof AppError ? err : new AppError("Could not create the order, please try again", 502);
  }
});

// ---- Payment verification ----------------------------------------------------
// The frontend sends the 3 values Razorpay Checkout returns. We recompute the signature on the server.
exports.verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) throw new AppError("Order not found", 404);
  if (order.paymentMethod !== "razorpay") throw new AppError("This order is not an online payment order", 400);
  if (order.payment.status === "paid") return ok(res, order); // idempotent: safe to retry
  if (order.payment.razorpayOrderId !== razorpay_order_id) throw new AppError("Payment does not match this order", 400);

  if (!razorpay.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new AppError("Invalid payment signature", 400);
  }

  // status check is inside the query: if the order expired/cancelled in the meantime, this won't match
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending_payment" },
    {
      status: "paid",
      "payment.status": "paid",
      "payment.razorpayPaymentId": razorpay_payment_id,
      "payment.paidAt": new Date(),
    },
    { new: true }
  );
  if (!updated) {
    throw new AppError("This order was cancelled or expired before payment was confirmed. Contact support for a refund.", 409);
  }
  ok(res, updated);
});

// ---- Reading / cancelling my orders -------------------------------------------
exports.getMyOrders = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { user: req.user.id };
  if (req.query.status) filter.status = String(req.query.status);
  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).sort("-createdAt").skip(skip).limit(limit),
  ]);
  ok(res, orders, 200, { total, totalPages: Math.ceil(total / limit), currentPage: page });
});

// Owner or admin. Non-owners get 404 so order IDs don't leak.
exports.getOrder = catchAsync(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.user = req.user.id;
  const order = await Order.findOne(filter).populate("user", "name email");
  if (!order) throw new AppError("Order not found", 404);
  ok(res, order);
});

exports.cancelMyOrder = catchAsync(async (req, res) => {
  const exists = await Order.exists({ _id: req.params.id, user: req.user.id });
  if (!exists) throw new AppError("Order not found", 404);
  const order = await orderService.cancelOrder(req.params.id, { user: req.user.id });
  if (!order) throw new AppError("This order can no longer be cancelled", 409);
  ok(res, order);
});
