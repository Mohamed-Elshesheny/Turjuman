const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failure",
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || req.hostname.includes("vercel.app"),
      sameSite: process.env.NODE_ENV === "production" || req.hostname.includes("vercel.app") ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(
      `https://turjuman.netlify.app/auth/callback?token=${token}`
    );
  }
); //

router.get("/login-failure", (req, res) => {
  res.send("Failed to login!");
});

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
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
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || req.hostname.includes("vercel.app"),
      sameSite: process.env.NODE_ENV === "production" || req.hostname.includes("vercel.app") ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(
      `https://turjuman.netlify.app/auth/callback?token=${token}`
    );
  }
);

module.exports = router;
