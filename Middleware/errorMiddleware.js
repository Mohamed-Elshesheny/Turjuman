const handleRedisError = (err) => {
  if (
    err.name === "RedisError" ||
    err.code === "ECONNREFUSED" ||
    err.name === "ConnectionTimeoutError"
  ) {
    err.statusCode = 503;
    err.status = "fail";
    err.message = "Redis service unavailable. Please try again later.";
  }
  return err;
};

const handleDeepgramError = (err) => {
  if (err.__dgError || (err.message && err.message.includes("Deepgram"))) {
    err.statusCode = 502;
    err.status = "fail";
    err.message = "Speech-to-text service failed. Please retry.";
  }
  return err;
};

const handleMongoError = (err) => {
  if (
    err.name === "MongoServerSelectionError" ||
    (err.message && err.message.includes("Mongo"))
  ) {
    err.statusCode = 503;
    err.status = "fail";
    err.message = "Database connection error. Please check your DB connection.";
  }
  return err;
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Error";

  err = handleRedisError(err);
  err = handleDeepgramError(err);
  err = handleMongoError(err);

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
    message: err.message || "Something went wrong, please try again later.",
    code: err.statusCode,
  });
};

module.exports = globalErrorHandler;
