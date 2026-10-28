const Order = require("../models/Order");
const Product = require("../models/Product");

const CANCELLABLE = ["pending_payment", "paid", "processing"];

// Put reserved stock back on the shelf
const restoreStock = (items) =>
  Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })));

// Atomically move an order to "cancelled". The status check lives inside the update query,
// so two simultaneous cancels (or cancel vs. payment) can never both succeed -> stock is restored once.
// Returns the updated order, or null if the order wasn't in a cancellable state.
exports.cancelOrder = async (orderId, extraFilter = {}) => {
  const prev = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: CANCELLABLE }, ...extraFilter },
    { status: "cancelled", cancelledAt: new Date() }
  ); // returns the document as it was BEFORE the update
  if (!prev) return null;

  await restoreStock(prev.items);
  if (prev.payment.status === "paid") {
    await Order.updateOne({ _id: prev._id }, { "payment.status": "refund_pending" });
  }
  return Order.findById(prev._id);
};

// Release stock held by unpaid orders (run on a timer from server.js)
exports.expireStaleOrders = async (minutes = 30) => {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const stale = await Order.find({ status: "pending_payment", createdAt: { $lt: cutoff } }).select("_id");
  for (const o of stale) await exports.cancelOrder(o._id);
  return stale.length;
};

exports.restoreStock = restoreStock;
exports.CANCELLABLE = CANCELLABLE;
