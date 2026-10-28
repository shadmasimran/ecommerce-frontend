const crypto = require("crypto");
const Razorpay = require("razorpay");
const AppError = require("../utils/AppError");

let instance;
const getInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError("Online payments are not configured on this server. Use paymentMethod 'cod'.", 503);
  }
  instance ||= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return instance;
};

// amountPaise must be an integer (Razorpay works in the smallest currency unit)
exports.createOrder = ({ amountPaise, receipt }) =>
  getInstance().orders.create({ amount: amountPaise, currency: "INR", receipt });

// HMAC-SHA256 of "order_id|payment_id" with the key secret, compared in constant time
exports.verifySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
