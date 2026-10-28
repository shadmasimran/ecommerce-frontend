// Wraps async controllers so we don't need try/catch in every one
module.exports = (fn) => (req, res, next) => fn(req, res, next).catch(next);
