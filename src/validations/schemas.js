const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

// Images can be added by URL (any https image) or come from Cloudinary uploads (which also have a publicId)
const imageSchema = Joi.object({
  url: Joi.string().uri({ scheme: ["http", "https"] }).required(),
  publicId: Joi.string().allow(""),
});

exports.registerSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(72).required(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.createProductSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().allow("").max(5000),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
  category: Joi.string().max(50).required(),
  images: Joi.array().items(imageSchema).max(8),
  isActive: Joi.boolean(),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(150),
  description: Joi.string().allow("").max(5000),
  price: Joi.number().min(0),
  stock: Joi.number().integer().min(0),
  category: Joi.string().max(50),
  images: Joi.array().items(imageSchema).max(8),
  isActive: Joi.boolean(),
}).min(1);

exports.addToCartSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).max(20).default(1),
});

exports.updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(20).required(),
});

exports.checkoutSchema = Joi.object({
  paymentMethod: Joi.string().valid("razorpay", "cod").required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().max(80).required(),
    phone: Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).required(),
    line1: Joi.string().max(150).required(),
    line2: Joi.string().allow("").max(150),
    city: Joi.string().max(60).required(),
    state: Joi.string().max(60).required(),
    postalCode: Joi.string().max(12).required(),
    country: Joi.string().max(60).default("India"),
  }).required(),
});

exports.verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
});

exports.orderStatusSchema = Joi.object({
  status: Joi.string().valid("processing", "shipped", "delivered", "cancelled").required(),
});
