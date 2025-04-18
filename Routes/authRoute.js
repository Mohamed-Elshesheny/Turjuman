const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
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
    const token = jwt.sign({ id: req.user.id, loginMethod: "google" }, process.env.JWT_SECRET, {
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

const authController = require("../Controllers/authController");

router.get("/logout", authController.logout);

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
    const token = jwt.sign({ id: req.user.id, loginMethod: "facebook" }, process.env.JWT_SECRET, {
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

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ googleId: profile.id });
  if (user) {
    console.log("🔁 Existing Google user found:", user.email);
  } else {
    console.log("🆕 Creating new Google user for:", profile.emails[0].value);
    user = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      photo: profile.photos[0].value,
      loginMethod: "google",
    });
  }
  done(null, user);
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/auth/facebook/callback",
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ facebookId: profile.id });
  if (user) {
    console.log("🔁 Existing Facebook user found:", user.email);
  } else {
    console.log("🆕 Creating new Facebook user for:", profile.emails?.[0]?.value || "No Email");
    user = await User.create({
      facebookId: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value || null,
      photo: profile.photos?.[0]?.value || null,
      loginMethod: "facebook",
    });
  }
  done(null, user);
}));

module.exports = router;
