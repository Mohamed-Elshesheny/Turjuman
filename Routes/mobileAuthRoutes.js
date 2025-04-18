const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authController = require("../Controllers/authController");
const { OAuth2Client } = require("google-auth-library");
const User = require("../Models/userModel");
const fetch = require("node-fetch");

function issueToken(res, user) {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Mobile Login
router.post("/google/mobile", async (req, res) => {
  try {
    const { idToken } = req.body;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;

    // Check if user exists or create new
    let user = await User.findOne({ googleId });

    // Prevent login if signed up with Facebook
    if (
      !user &&
      (await User.findOne({
        email: payload.email,
        facebookId: { $exists: true },
      }))
    ) {
      return res
        .status(400)
        .json({
          message: "This email is already registered with Facebook login.",
        });
    }

    if (!user) {
      user = await User.create({
        googleId,
        name: payload.name,
        email: payload.email,
        photo: payload.picture,
        loginMethod: "google",
      });
    }

    issueToken(res, user);
  } catch (err) {
    console.error("Google mobile login error:", err);
    res.status(500).json({ message: "Google login failed." });
  }
});

// Facebook Mobile Login
router.post("/facebook/mobile", async (req, res) => {
  try {
    const { accessToken, userID } = req.body;

    const fbRes = await fetch(
      `https://graph.facebook.com/v18.0/${userID}?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const data = await fbRes.json();

    if (!data.email) {
      return res
        .status(400)
        .json({ message: "Email is required from Facebook." });
    }

    // Prevent login if signed up with Google
    const existingEmailUser = await User.findOne({
      email: data.email,
      googleId: { $exists: true },
    });
    if (existingEmailUser) {
      return res
        .status(400)
        .json({
          message: "This email is already registered with Google login.",
        });
    }

    let user = await User.findOne({ facebookId: data.id });

    if (!user) {
      user = await User.create({
        facebookId: data.id,
        name: data.name,
        email: data.email,
        photo: data.picture?.data?.url || null,
        loginMethod: "facebook",
      });
    }

    issueToken(res, user);
  } catch (err) {
    console.error("Facebook mobile login error:", err);
    res.status(500).json({ message: "Facebook login failed." });
  }
});

router.post("/logout/mobile", authController.logout);

module.exports = router;
