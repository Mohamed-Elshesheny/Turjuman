const User = require("./../Models/userModel");
const catchAsync = require("express-async-handler");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const session = require("express-session");
const Email = require("../utils/email");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieExpiresInDays = process.env.JWT_COOKIE_EXPIRES_IN || 7;

  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpiresInDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
    cookieOptions.sameSite = "None";
  } else {
    cookieOptions.sameSite = "Lax";
  }

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // 1) Create the new user
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    isPremium: req.body.isPremium,
    role: req.body.role,
  });

  const verifyToken = newUser.createEmailVerifyToken();
  await newUser.save({ validateBeforeSave: false });

  const verificationURL = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${verifyToken}`;
  const email = new Email(newUser.email, newUser.name, verificationURL);
  await email.sendVerificationEmail();
  return res.status(200).json({
    status: "success",
    message: "Verification email sent. Please check your inbox.",
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please Provide an email and a passowrd!", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Invalid email or password", 401));
  }

  if (!user.isEmailVerified) {
    return next(
      new AppError("Please verify your email before logging in.", 401)
    );
  }

  if (user) {
    user.isActive = true;
    await user.save({ validateModifiedOnly: true });
  }
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
    domain: ".turjuman.online",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully and cookie cleared!",
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1️⃣ Get token from header or cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // 2️⃣ Check if token exists
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 3️⃣ Verify token validity
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("JWT verify error:", err);
    return next(
      new AppError("Invalid or expired token! Please log in again.", 401)
    );
  }

  // 4️⃣ Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  if (!currentUser.isEmailVerified) {
    return next(
      new AppError("Please verify your email before accessing this route.", 403)
    );
  }

  // 5️⃣ Check if user changed password after token was issued
  if (currentUser.ChangedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password recently changed. Please log in again.", 401)
    );
  }

  // 6️⃣ Grant access
  req.user = currentUser;
  next();
});

exports.restricTo = (...roles) => {
  // Rest Parameter
  // roles is an array of ['admin'] return is the middleware fun
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this!", 403)
      );
    }
    next();
  };
};

exports.updateUserPassword = catchAsync(async (req, res, next) => {
  const logedUser = await User.findById(req.params.id).select("+password");

  if (!logedUser) {
    return next(
      new AppError(`No user found with this ID ${req.params.id}`, 404)
    );
  }

  const { password, confirmpassword, CurrentPassword } = req.body;

  const isMatch = await bcrypt.compare(CurrentPassword, logedUser.password);
  if (!isMatch) {
    return next(new AppError("Wrong Current Password. Please try again.", 401));
  }

  if (password !== confirmpassword) {
    return next(new AppError("Passwords do not match. Please try again.", 400));
  }

  const hashedPassword = crypto.hash(password, 12);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { password: hashedPassword },
    { new: true, validateModifiedOnly: true }
  );

  if (!user) {
    return next(
      new AppError(`No user found with this ID ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
    data: user,
  });
});

exports.protectUserTranslate = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer")
    ? req.headers.authorization.split(" ")[1]
    : req.cookies?.jwt;

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    req.user = null;
    return next();
  }

  if (!currentUser.isEmailVerified) {
    return next(
      new AppError("Please verify your email before accessing this route.", 403)
    );
  }

  if (currentUser.ChangedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "The user recently changed the password! please log in again",
        401
      )
    );
  }

  req.user = currentUser;
  next();
});

exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with this email address", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    const email = new Email(user, resetURL);
    await email.sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpired = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  if (!req.params.token) {
    return next(new AppError("Token is missing!", 400));
  }

  if (!req.body.password || !req.body.passwordConfirm) {
    return next(
      new AppError("Please provide both password and passwordConfirm", 400)
    );
  }

  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpired: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or expired!", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpired = undefined;
  await user.save();

  console.log(`Resetting password for user: ${user.email}`);

  createSendToken(user, 200, res);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const token = req.params.token;

  if (!token) {
    return next(new AppError("Token is missing.", 400));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired.", 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Email verified successfully!",
  });
});
