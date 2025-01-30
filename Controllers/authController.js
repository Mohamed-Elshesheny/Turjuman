const User = require("./../Models/userModel");
const catchAsync = require("express-async-handler");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const session = require("express-session");

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
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    isPremium: req.body.isPremium,
    role: req.body.role,
  });

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

  createSendToken(newUser, 201, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully!",
  });
};

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  // if (
  //   req.headers.authorization &&
  //   req.headers.authorization.startsWith("Bearer")
  // ) {
  //   token = req.headers.authorization.split(" ")[1];
  // }
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("Your are not logged in , please login agin", 401)
    );
  }
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("The user is belonging to token is no longer exists", 401)
      );
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "The user recently changed password!,please login again.",
          401
        )
      );
    }
    req.user = currentUser;
    next();
  } catch (err) {
    return next(
      new AppError("Your are not logged in , please login agin", 401)
    );
  }
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

  const hashedPassword = await bcrypt.hash(password, 12);

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
exports.protectUserTranslate = asyncHandler(async (req, res, next) => {
  let token;
  // if (
  //   req.headers.authorization &&
  //   req.headers.authorization.startsWith("Bearer")
  // ) {
  //   token = req.headers.authorization.split(" ")[1];
  // }
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      req.user = null;
      return next();
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "The user recently changed password!,please login again.",
          401
        )
      );
    }
    req.user = currentUser;
    next();
  } catch (err) {
    return next();
  }
});
