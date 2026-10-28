// Must be registered LAST in app.js
module.exports = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue)[0]} already exists`;
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5 MB)" : err.message;
  }

  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") message = "Internal Server Error";
  }
  res.status(status).json({ success: false, message });
};
