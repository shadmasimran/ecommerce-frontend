// Usage: npm run seed
// Creates an admin user (from .env) and sample products if the products collection is empty.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const Product = require("../src/models/Product");

const products = [
  { name: "Wireless Mouse", description: "2.4GHz wireless mouse with silent clicks", price: 599, stock: 40, category: "electronics" },
  { name: "Mechanical Keyboard", description: "Hot-swappable 75% keyboard, blue switches", price: 3499, stock: 15, category: "electronics" },
  { name: "USB-C Hub 7-in-1", description: "HDMI, SD card, 3x USB-A, PD charging", price: 1799, stock: 25, category: "electronics" },
  { name: "Cotton T-Shirt", description: "Regular fit, 100% cotton", price: 399, stock: 100, category: "clothing" },
  { name: "Denim Jacket", description: "Classic mid-wash denim jacket", price: 2199, stock: 12, category: "clothing" },
  { name: "Stainless Steel Bottle 750ml", description: "Keeps drinks cold for 24 hours", price: 449, stock: 60, category: "home" },
  { name: "Desk Lamp (LED)", description: "Dimmable lamp with 3 colour modes", price: 899, stock: 3, category: "home" },
  { name: "Notebook Pack (3)", description: "A5 ruled notebooks, 160 pages each", price: 249, stock: 200, category: "stationery" },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({ name: "Admin", email, password: await bcrypt.hash(password, 10), role: "admin" });
    console.log(`Created admin: ${email}  (password from ADMIN_PASSWORD in .env)`);
  } else {
    console.log(`Admin ${email} already exists`);
  }

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(products.map((p) => ({ ...p, createdBy: admin._id })));
    console.log(`Inserted ${products.length} sample products`);
  } else {
    console.log("Products already exist, skipping sample data");
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
