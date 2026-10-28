require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { expireStaleOrders } = require("./src/services/orderService");

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs:   http://localhost:${PORT}/api-docs`);
  });

  // Every 5 minutes: cancel unpaid online orders older than 30 minutes and release their stock
  setInterval(() => {
    expireStaleOrders(30)
      .then((n) => n && console.log(`Expired ${n} unpaid order(s)`))
      .catch((e) => console.error("Order expiry job failed:", e.message));
  }, 5 * 60 * 1000).unref();
});
