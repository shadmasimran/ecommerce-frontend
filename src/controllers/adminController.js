const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const orderService = require("../services/orderService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const paginate = require("../utils/pagination");
const { ok } = require("../utils/response");

// Allowed forward transitions for non-cancel updates
const TRANSITIONS = {
  paid: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
};

exports.listOrders = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.user) filter.user = String(req.query.user);

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).populate("user", "name email").sort("-createdAt").skip(skip).limit(limit),
  ]);
  ok(res, orders, 200, { total, totalPages: Math.ceil(total / limit), currentPage: page });
});

exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (status === "cancelled") {
    const cancelled = await orderService.cancelOrder(order._id);
    if (!cancelled) throw new AppError(`A ${order.status} order cannot be cancelled`, 409);
    return ok(res, cancelled);
  }

  if (!(TRANSITIONS[order.status] || []).includes(status)) {
    throw new AppError(`Cannot move an order from "${order.status}" to "${status}"`, 409);
  }

  const update = { status };
  // Cash on delivery is only "paid" once it has actually been delivered
  if (status === "delivered" && order.paymentMethod === "cod") {
    update["payment.status"] = "paid";
    update["payment.paidAt"] = new Date();
  }
  // Compare-and-set on the old status so two admins can't both apply a transition
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, update, { new: true });
  if (!updated) throw new AppError("Order was changed by someone else, please reload", 409);
  ok(res, updated);
});

// Dashboard numbers. "Revenue" = orders whose payment is actually collected (online paid, or COD delivered).
exports.getStats = catchAsync(async (req, res) => {
  const paidMatch = { "payment.status": "paid", status: { $ne: "cancelled" } };

  const [revenueAgg, byStatus, topProducts, lowStock, users, products] = await Promise.all([
    Order.aggregate([{ $match: paidMatch }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $in: ["paid", "processing", "shipped", "delivered"] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]),
    Product.find({ isActive: true, stock: { $lte: 5 } }).select("name stock").sort("stock").limit(10),
    User.countDocuments(),
    Product.countDocuments({ isActive: true }),
  ]);

  ok(res, {
    revenue: revenueAgg[0]?.revenue || 0,
    paidOrders: revenueAgg[0]?.orders || 0,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    topProducts,
    lowStock,
    totalUsers: users,
    activeProducts: products,
  });
});
