const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { ok } = require("../utils/response");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

exports.register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  // role is never taken from the body, so nobody can self-register as admin
  const user = await User.create({ name, email, password: hash });
  ok(res, { id: user._id, name: user.name, email: user.email, role: user.role }, 201, {
    message: "Registered successfully",
  });
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  // Same message for "no such user" and "wrong password" (don't leak which one)
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid || !user.isActive) throw new AppError("Invalid credentials", 401);

  ok(res, { token: signToken(user) });
});

exports.getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  ok(res, user);
});

// Admin only: promote/demote a user
exports.changeRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) throw new AppError("Role must be 'user' or 'admin'", 400);
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
  if (!user) throw new AppError("User not found", 404);
  ok(res, user);
});
