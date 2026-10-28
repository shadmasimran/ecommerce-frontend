const mongoose = require("mongoose");

const STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Snapshot of product data at purchase time (later price edits must not change old orders)
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        _id: false,
      },
    ],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "India" },
    },
    subtotal: Number,
    shippingFee: Number,
    total: Number,
    paymentMethod: { type: String, enum: ["razorpay", "cod"], required: true },
    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "cod", "failed", "refund_pending"],
        default: "pending",
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
    },
    status: { type: String, enum: STATUSES, default: "pending_payment", index: true },
    cancelledAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.STATUSES = STATUSES;
