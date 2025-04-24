// const AppError = require("./../utils/AppError");

// const handleCastErrorDB = (err) => {
//   const message = `Invalid ${err.path}: ${err.value}.`;
//   return new AppError(message, 400);
// };

// const handleDuplicateFields = (err) => {
//   // const value = err.keyValue.match(/(["'])(\\?.)*?\1/)[0];
//   // const message = `Duplicate field value(s): ${value}. Please try different value(s)!`;
//   const message = `Duplicate field value: ${err.keyValue.name}. Please use another value.`;

//   return new AppError(message, 400);
// };

// const handleJWTError = () =>
//   new AppError("Invalid token, Please login again!", 401);

// const handleTokenExpiredError = () =>
//   new AppError("The token has been expierd !", 401);

// const handleValidatorError = (err) => {
//   const error = Object.values(err.errors).map((el) => el.message);
//   const message = `Invaild Input Data :( The error is ${error}`;
//   return new AppError(message, 400);
// };

// const sendErrorDev = (err, res) => {
//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message,
//     err,
//     stack: err.stack,
//   });
// };

// const sendErrorProd = (err, res) => {
//   if (err.isOperational) {
//     res.status(err.statusCode).json({
//       status: err.status,
//       message: err.message,
//     });
//   } //everything that is not marked operational
//   else {
//     console.error("💥 Error! 💥", err);
//     res.status(err.statusCode).json({
//       //status code is always 500
//       status: err.status, //status is always "error"
//       message: err.message,
//     });
//   }
// };

// module.exports = (err, req, res, next) => {
//   // console.log(err);
//   console.log(err.statusCode);

//   err.statusCode = err.statusCode || 500; //500 because of mongoose or something else. (unknown)
//   err.status = err.status || "error";
//   if (process.env.NODE_ENV === "development") sendErrorDev(err, res);
//   else if (process.env.NODE_ENV === "production") {
//     let error = Object.create(err);
//     if (error.name === "CastError") error = handleCastErrorDB(error);
//     if (error.code === 11000) error = handleDuplicateFields(error);
//     if (error.name === "ValidatorError") error = handleValidatorError(error);
//     if (error.name === "JsonWebTokenError") error = handleJWTError();
//     if (error.name === "TokenExpiredError") error = handleTokenExpiredError();
//     sendErrorProd(error, res);
//     //sendErrorProd(error, res);
//   }
// };
