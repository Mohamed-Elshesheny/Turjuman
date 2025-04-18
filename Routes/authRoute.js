const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const authController = require("../Controllers/authController");

function issueTokenAndRedirect(req, res, loginMethod) {
  const token = jwt.sign(
    { id: req.user.id, loginMethod },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || req.hostname.includes("vercel.app"),
    sameSite: process.env.NODE_ENV === "production" || req.hostname.includes("vercel.app") ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`https://turjuman.netlify.app/auth/callback?token=${token}`);
}

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get("/logout", authController.logout);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failure",
  }),
  (req, res) => {
    issueTokenAndRedirect(req, res, "google");
  }
); //

router.get("/login-failure", (req, res) => {
  res.send("Failed to login!");
});

// Facebook login
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/auth/login-failure",
  }),
  (req, res) => {
    issueTokenAndRedirect(req, res, "facebook");
  }
);

module.exports = router;
