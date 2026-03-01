const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server Error";

  // wrong mongodb id error
  if (err.name === "CastError") {
    const message = `Resources not found with this id.. Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate key ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  // wrong jwt error
  if (err.name === "JsonWebTokenError") {
    const message = `Your url is invalid please try again later`;
    err = new ErrorHandler(message, 400);
  }

  // jwt expired
  if (err.name === "TokenExpiredError") {
    const message = `Your Url is expired please try again later!`;
    err = new ErrorHandler(message, 400);
  }

  // Express 5 specific: handle URI errors
  if (err.code === "ERR_INVALID_URL" || err.code === "ERR_INVALID_URI") {
    const message = `Invalid URL provided`;
    err = new ErrorHandler(message, 400);
  }

  // Handle payload too large error
  if (err.type === "entity.too.large") {
    const message = `Request payload too large`;
    err = new ErrorHandler(message, 413);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV !== "PRODUCTION" && { stack: err.stack }),
  });
};
