const AppError = require("../utils/AppError");

// validate(schema) -> checks req.body, strips unknown fields
module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new AppError(error.details.map((d) => d.message).join(", "), 400));
  }
  req.body = value;
  next();
};
