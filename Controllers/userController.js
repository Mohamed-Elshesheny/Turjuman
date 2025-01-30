const User = require("../Models/userModel");
const catchAsync = require("express-async-handler");
const AppError = require("./../utils/AppError");
const ApiFeaturs = require("../utils/ApiFeaturs");
const factory = require("../Controllers/handerController");
const bcrypt = require("bcryptjs");


const filterObj = (obj, ...allowedfileds) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedfileds.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Here we made a middleware to save the current user ID
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) create error if user update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for update password ,please use /updateMyPassword",
        400
      )
    );
  }

  //2) filtered out unwanted fileds name that not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email");

  //3)Update user Doucment
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// exports.deleteMe = catchAsync(async (req, res, next) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });
//   res.status(204).json({
//     status: "success",
//     data: null,
//   });
// });

exports.updateUser = catchAsync(async (req, res, next) => {
  const doc = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      validateModifiedOnly: true,
    }
  );
  if (!doc) {
    return next(
      new AppError(`No Document found with this ID ${req.body.password}`, 404)
    );
  }
  res.status(200).json({
    status: "success",
    data: doc,
  });
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteMe = factory.deleteOne(User);
