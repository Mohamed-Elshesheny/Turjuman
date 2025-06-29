// 📦 Core Modules
const fs = require("fs");
const path = require("path");

// 🚀 Third-party Packages
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const passport = require("passport");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const compression = require("compression");

// 🛠 Custom Modules
const userRouter = require("./Routes/userRoute");
const translateRouter = require("./Routes/translateRoute");
const authRoute = require("./Routes/authRoute");
const mobileAuth = require("./Routes/mobileAuthRoutes");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./Middleware/errorMiddleware");
const { swaggerUi, swaggerSpec } = require("./utils/swaggerConfig");
require("./utils/ passport");

// 🚀 Express App Initialization
const app = express();
app.use(express.static("public"));

// 🗂 Serve Static Files
app.use(
  "/api",
  express.static(path.join(__dirname, "node_modules/swagger-ui-dist"))
);

// ⚡️ Enable Compression
app.use(compression());

// 🌐 CORS Configuration
const corsOptions = {
  origin: [
    "https://turjuman.netlify.app",
    "https://turjuman.online",
    "https://www.turjuman.online",
  ],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// 🍪 Cookie Parser
app.use(cookieParser());

// 🗝 Session Management
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

// 🔐 Authentication with Passport
app.use(passport.initialize());
app.use(passport.session());

// 🛡 Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(mongoSanitize());
app.use(xss());

// 📝 Logging in Development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 📦 Body Parser
app.use(express.json({ limit: "10kb" }));

// 🎯 API Home Route
app.get("/", (req, res) => {
  res.send("Welcome to Turjuman API [Beta]");
});

// 🛣 Mounted Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/", translateRouter);
app.use("/auth", authRoute);
app.use("/auth/mobile", mobileAuth);

// 🗺 Sitemap Route
app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.resolve(__dirname, "sitemap.xml");
  fs.readFile(sitemapPath, (err, data) => {
    if (err) {
      console.error("Error reading sitemap.xml:", err);
      return res.status(500).send("Error loading sitemap.");
    }
    res.header("Content-Type", "application/xml");
    res.send(data);
  });
});

// 🤖 Robots.txt Route
app.get("/robots.txt", (req, res) => {
  const robotsPath = path.resolve(__dirname, "robots.txt");
  fs.readFile(robotsPath, (err, data) => {
    if (err) {
      console.error("Error reading robots.txt:", err);
      return res.status(500).send("Error loading robots.txt.");
    }
    res.header("Content-Type", "text/plain");
    res.send(data);
  });
});

// 📚 Swagger Docs Route
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true })
);

// ❌ Handle Unmatched Routes
app.use("*", (req, res, next) => {
  next(new AppError(`Can't Find this URL ${req.originalUrl}`, 400));
});

// 🛠 Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
