const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
    description: { type: String, default: "", maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    category: { type: String, required: true, lowercase: true, trim: true, index: true },
    images: [{ url: String, publicId: String, _id: false }],
    isActive: { type: Boolean, default: true, index: true }, // soft delete: old orders keep working
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
