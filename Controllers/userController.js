/**
 * User Controller - Handles user-related operations such as profile updates, photo uploads,
 * and account deactivation. Integrates with Multer for file handling and Sharp for image processing.
 */
const cloudinary = require('../utils/Cloudinary')
const streamifier = require("streamifier");
const User = require("../Models/userModel");
const catchAsync = require("express-async-handler");
const AppError = require("./../utils/AppError");
const factory = require("../Controllers/handerController");
const multer = require("multer");
const sharp = require("sharp");

// Configure Multer to store uploaded images in memory for processing
const multerStorage = multer.memoryStorage();

// Filter to allow only image files to be uploaded
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an Image! Please upload Only Images", 400), false);
  }
};

// Initialize Multer with defined storage and file filter
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Middleware to handle single file upload for user photos
exports.uploadUserPhoto = upload.single("photo");

/**
 * Middleware to resize uploaded user photos and upload to Cloudinary.
 */
exports.resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();

  const buffer = await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  const uploadFromBuffer = () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "users",
          public_id: `user-${req.user.id}-${Date.now()}`,
        },
        (error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        }
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });

  const result = await uploadFromBuffer();

  req.file.filename = result.secure_url;

  next();
};

/**
 * Utility function to filter out unwanted fields from request body.
 * Only allows specified fields to be updated.
 */
const filterObj = (obj, ...allowedfileds) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedfileds.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/**
 * Middleware to attach current user's ID to request parameters.
 * Useful for reusing generic getOne methods.
 */
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

/**
 * Controller for updating current user's data (excluding password).
 * Validates input and updates allowed fields only.
 */
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
  if (req.file) filteredBody.photo = req.file.filename;

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

/**
 * Controller to deactivate the current user's account.
 * Sets 'active' field to false without deleting the user data.
 */
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: "success",
    data: null,
  });
});

/**
 * Admin Controller: Update user details by ID.
 * Allows selective update and validates modified fields.
 */
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
      new AppError(`No Document found with this ID ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    status: "success",
    data: doc,
  });
});

// Generic factory methods for standard CRUD operations
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
