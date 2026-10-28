const FREE_SHIPPING_ABOVE = 999; // INR
const FLAT_SHIPPING = 50;

const round2 = (n) => Math.round(n * 100) / 100;

// items: [{ price, quantity }]
exports.calcTotals = (items) => {
  const subtotal = round2(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_ABOVE ? 0 : FLAT_SHIPPING;
  return { subtotal, shippingFee, total: round2(subtotal + shippingFee) };
};

exports.round2 = round2;
