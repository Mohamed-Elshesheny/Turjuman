const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../Models/userModel");
const Email = require("../utils/email");

// ============================
// Google Strategy
// ============================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          const existingEmailUser = await User.findOne({ email: profile.emails[0].value });
          if (existingEmailUser && existingEmailUser.loginMethod !== "google") {
            console.log("❌ Email already used with another login method.");
            return done(null, false, { message: "This email is already registered using another login method." });
          }

          console.log("🆕 Creating new Google user for:", profile.emails[0].value);
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            photo: profile.photos[0].value,
            loginMethod: "google",
          });
          await new Email(user, "https://turjuman.netlify.app").sendWelcome();
        } else {
          console.log("🔁 Existing Google user found:", user.email);
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ============================
// Facebook Strategy
// ============================
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "emails", "name", "displayName", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ facebookId: profile.id });
        if (!user) {
          const existingEmailUser = await User.findOne({ email: profile.emails?.[0]?.value });
          if (existingEmailUser && existingEmailUser.loginMethod !== "facebook") {
            console.log("❌ Email already used with another login method.");
            return done(null, false, { message: "This email is already registered using another login method." });
          }

          console.log("🆕 Creating new Facebook user for:", profile.emails?.[0]?.value || "No Email");
          user = await User.create({
            facebookId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value || null,
            photo: profile.photos?.[0]?.value || null,
            loginMethod: "facebook",
          });
          await new Email(user, "https://turjuman.netlify.app").sendWelcome();
        } else {
          console.log("🔁 Existing Facebook user found:", user.email);
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ============================
// Serialize / Deserialize
// ============================
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
