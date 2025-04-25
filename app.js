const fs = require("fs");
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const userRouter = require("./Routes/userRoute");
const translateRouter = require("./Routes/translateRoute");
const AppError = require("./utils/AppError");
const bodyParser = require("body-parser");
const globalErrorHandler = require("./Middleware/errorMiddleware");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const passport = require("passport");
require("./utils/ passport");
const authRoute = require("./Routes/authRoute");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const mobileAuth = require("./Routes/mobileAuthRoutes");

const app = express();

const corsOptions = {
  origin: "https://turjuman.netlify.app",
  // const origin = process.env.NODE_ENV === "production"
  // ? "https://turjuman.netlify.app"
  // : "*";
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      collectionName: "sessions",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);
// cors
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.get("/", (req, res) => {
  res.send("Welcome to Turjuman API[Beta]");
});

//Mounted Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/", translateRouter);
app.use("/auth", authRoute);
app.use("/auth/mobile", mobileAuth);

app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.join(__dirname, "sitemap.xml");
  fs.readFile(sitemapPath, (err, data) => {
    if (err) {
      return res.status(500).end();
    }
    res.header("Content-Type", "application/xml");
    res.send(data);
  });
});

//Handle unrouted routes with express
app.use("*", (req, res, next) => {
  next(new AppError(`Can't Find this URL ${req.originalUrl}`, 400));
});

app.use(globalErrorHandler);

module.exports = app;
