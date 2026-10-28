require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

// Paste one direct image link per product between the quotes ("" = skip)
const LINKS = {
    "Wireless Mouse": "https://images.unsplash.com/photo-xxxx",
  "Mechanical Keyboard": "",
  "USB-C Hub 7-in-1": "",
  "Cotton T-Shirt": "",
  "Denim Jacket": "",
  "Stainless Steel Bottle 750ml": "",
  "Desk Lamp (LED)": "",
  "Notebook Pack (3)": "",
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const [name, raw] of Object.entries(LINKS)) {
    const link = raw.trim();
    if (!link) { console.log(`- ${name}: skipped`); continue; }
    if (!/^https?:\/\/\S+$/i.test(link)) { console.log(`x ${name}: not a valid link`); continue; }
    const r = await Product.updateOne({ name }, { images: [{ url: link }] });
    console.log(r.matchedCount ? `✓ ${name}` : `x ${name}: product not found`);
  }
  await mongoose.disconnect();
})();