const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Authentication: who are you?
exports.protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("No token provided", 401);

  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  // Re-check the user still exists and is active (token may outlive the account)
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new AppError("User no longer exists", 401);

  req.user = { id: user._id.toString(), role: user.role };
  next();
});

// Authorization: what can you do?
exports.authorise = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError("Access denied", 403));
  next();
};
