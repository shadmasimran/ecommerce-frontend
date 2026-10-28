const multer = require("multer");
const AppError = require("../utils/AppError");

// Memory storage: file stays in RAM, then streams straight to Cloudinary
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new AppError("Images only", 400));
    cb(null, true);
  },
});
