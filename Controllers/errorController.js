const AppError = require("./../utils/AppError");

// Handle cast error for invalid database IDs
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

// Handle duplicate fields in the database
const handleDuplicateFields = (err) => {
  const message = `Duplicate field value: ${err.keyValue.name}. Please use another value.`;
  return new AppError(message, 400);
};

// Handle JWT error for invalid tokens
const handleJWTError = () =>
  new AppError("Invalid token, Please login again!", 401);

// Handle token expired error
const handleTokenExpiredError = () =>
  new AppError("The token has been expired!", 401);

// Handle validation errors
const handleValidatorError = (err) => {
  const error = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data :( The error is ${error}`;
  return new AppError(message, 400);
};

// Send error response in development environment
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    err,
    stack: err.stack,
  });
};

// Send error response in production environment
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("💥 Error! 💥", err);
    res.status(err.statusCode).json({
      status: err.status,
      message: "Something went very wrong!",
    });
  }
};

// Global error handling middleware
module.exports = (err, req, res, next) => {
  console.log(err.statusCode);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = Object.create(err);
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFields(error);
    if (error.name === "ValidationError") error = handleValidatorError(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleTokenExpiredError();
    sendErrorProd(error, res);
  }
};
