const globalErrorHandler = (err, req, res, next) => {
  console.log(err.statusCode);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Error";

  if (res.headersSent) return next(err);

  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(err, res);
  } else {
    sendErrorForProd(err, res);
  }
};

const sendErrorForDev = (err, res) => {
  if (res.headersSent) return;
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    err,
    stack: err.stack,
  });
};

const sendErrorForProd = (err, res) => {
  if (res.headersSent) return;
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

module.exports = globalErrorHandler;