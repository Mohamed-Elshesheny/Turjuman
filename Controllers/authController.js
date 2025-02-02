const User = require("./../Models/userModel");
const catchAsync = require("express-async-handler");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const session = require("express-session");
const Email = require("../utils/email");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
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

  // 2) Create a welcome email URL (if needed)
  const welcomeURL = `${req.protocol}://${req.get("host")}/welcome`;

  // 3) Send the welcome email
  try {
    const email = new Email(newUser, welcomeURL);
    await email.sendWelcome();
    console.log("Welcome email sent successfully!");
  } catch (err) {
    console.error("Error sending welcome email:", err);
    return next(
      new AppError("Failed to send welcome email. Please try again later.", 500)
    );
  }

  // 4) Create and send token
  createSendToken(newUser, 201, res);
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

  if (user) {
    user.isActive = true;
    await user.save({ validateModifiedOnly: true });
  }
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get the token from the Authorization header
  console.log(`authController.protect triggered for: ${req.originalUrl}`);
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verify the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if the user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
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

exports.restricTo = (...roles) => {
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
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

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

  createSendToken(user, 200, res);
});
