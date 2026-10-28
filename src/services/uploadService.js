const cloudinary = require("../config/cloudinary");

// Stream a Buffer (from multer memoryStorage) to Cloudinary
exports.uploadBuffer = (buffer, folder = "uploads") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

exports.deleteFile = (publicId) => cloudinary.uploader.destroy(publicId);
