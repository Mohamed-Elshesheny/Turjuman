const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const userRouter = require("./Routes/userRoute");
const translateRouter = require("./Routes/translateRoute");
const AppError = require("./utils/AppError");
const bodyParser = require("body-parser");
const globalErrorHandler = require("./Middleware/errorMiddleware");
const session = require("express-session");

const app = express();

const corsOptions = {
  origin:
    process.env.NODE_ENV === "production" ? "https://turjuman.vercel.app" : "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};
// cors
app.use(cors(corsOptions));

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
// app.use(
//   session({
//     secret: process.env.JWT_SECRET, // Replace with a strong secret key
//     resave: false, // Don't save the session if it hasn't changed
//     saveUninitialized: true, // Save new sessions
//   })
// );

app.get("/", (req, res) => {
  res.send("Welcome to Turjuman API[Beta]");
});
//Mounted Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/", translateRouter);

//Handle unrouted routes with express
app.use("*", (req, res, next) => {
  next(new AppError(`Can't Find this URL ${req.originalUrl}`, 400));
});

app.use(globalErrorHandler);

module.exports = app;
