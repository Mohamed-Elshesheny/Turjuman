const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const userRouter = require("./Routes/userRoute");
const translateRouter = require("./Routes/translateRoute");
const AppError = require("./utils/AppError");
const bodyParser = require("body-parser");
const errorController = require("./Controllers/errorController");

const app = express();

const corsOptions = {
  origin: "*", 
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", 
  allowedHeaders: "Content-Type,Authorization", 
};

app.use(cors(corsOptions));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
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

app.use(errorController);

module.exports = app;
