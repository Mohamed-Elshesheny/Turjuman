const User = require('../Models/userModel');
const catchAsync = require('express-async-handler');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Function to sign a JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
};

// Controller for user signup
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    isPremium: req.body.isPremium,
    role: req.body.role,
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

// Controller for user login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please Provide an email and a password!', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (user) {
    user.isActive = true;
    await user.save({ validateModifiedOnly: true });
  }

  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  });
});

// Middleware to protect routes
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get the token from the Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verify the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if the user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  if (currentUser.ChangedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'The user recently changed the password! please log in again',
        401
      )
    );
  }

  req.user = currentUser;

  next();
});

// Middleware to restrict access to certain roles
exports.restrictTo = (...roles) => {
  // roles is an array of ['admin'] return is the middleware fun
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this!', 403)
      );
    }
    next();
  };
};

// Controller to update user password
exports.updateUserPassword = catchAsync(async (req, res, next) => {
  const loggedUser = await User.findById(req.params.id).select('+password');

  if (!loggedUser) {
    return next(
      new AppError(`No user found with this ID ${req.params.id}`, 404)
    );
  }

  const { password, confirmpassword, CurrentPassword } = req.body;

  const isMatch = await bcrypt.compare(CurrentPassword, loggedUser.password);
  if (!isMatch) {
    return next(new AppError('Wrong Current Password. Please try again.', 401));
  }

  if (password !== confirmpassword) {
    return next(new AppError('Passwords do not match. Please try again.', 400));
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
    status: 'success',
    message: 'Password updated successfully',
    data: user,
  });
});
