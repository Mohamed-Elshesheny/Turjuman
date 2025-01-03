const translate = require("translate-google");
const savedtransModel = require("../Models/savedtransModel");
const userModel = require("../Models/userModel");
const catchAsync = require("express-async-handler");
const AppError = require("../utils/AppError");
const mongoose = require("mongoose");
const APIfeatures = require("../utils/ApiFeaturs");
const factory = require("../Controllers/handerController");

exports.checkTranslationLimit = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  console.log(`Checking daily limit for user: ${userId}`);

  const user = await userModel.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 401));
  }

  if (!user.dailyTranslations) {
    user.set({
      dailyTranslations: {
        count: 0,
        date: new Date(),
      },
    });
    await user.save({ validateModifiedOnly: true });
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const lastActivityDate = new Date(user.dailyTranslations.date)
    .toISOString()
    .split("T")[0];

  // Reset count if it's a new day
  if (currentDate !== lastActivityDate) {
    user.set({
      dailyTranslations: {
        count: 0,
        date: new Date(),
      },
    });
    await user.save({ validateModifiedOnly: true });
  }

  const dailyLimit = user.isPremium ? 100 : 100; // Example: Premium users get 100 translations; free-tier gets 2
  if (user.dailyTranslations.count >= dailyLimit) {
    return next(
      new AppError(
        `Daily translation limit of ${dailyLimit} reached. Upgrade to premium for more translations.`,
        403
      )
    );
  }

  // Increment count and save
  user.set({
    dailyTranslations: {
      count: user.dailyTranslations.count + 1, // Increment count
      date: user.dailyTranslations.date, // Keep the same date
    },
  });
  await user.save({ validateModifiedOnly: true });

  console.log(`Daily translations updated: ${user.dailyTranslations}`);

  next();
});

exports.translateText = catchAsync(async (req, res, next) => {
  const { text, fromLang, toLang } = req.body;

  // Validate inputs
  if (!text || !fromLang || !toLang) {
    return next(new AppError("Please provide text, fromLang, and toLang", 400));
  }

  // Use translate-google to get the translation
  const result = await translate(text, { from: fromLang, to: toLang });

  // Attach the translation result to the request object
  req.translationResult = result;

  next();
});

exports.saveTranslation = catchAsync(async (req, res, next) => {
  const { text, fromLang, toLang, isFavorite = false } = req.body;
  const userId = req.user.id;
  const result = req.translationResult;

  // Check if the translation already exists in the database
  const existingTranslation = await savedtransModel.findOne({
    text,
    fromLang,
    toLang,
    userId,
  });

  if (existingTranslation) {
    return res.status(409).json({
      status: "success",
      message: "Translation already exists",
      data: {
        original: text,
        translation: existingTranslation.translation,
        isFavorite: existingTranslation.isFavorite,
      },
    });
  }

  // Save the new translation to the database
  const savedTrans = await savedtransModel.create({
    text,
    fromLang,
    toLang,
    translation: result, // Use the result from translate-google
    userId,
    isFavorite,
  });

  const similarTranslations = await suggestSimilarTranslations(savedTrans);

  // Respond with the translation and saved entry
  res.status(200).json({
    status: "success",
    data: {
      original: text,
      translation: result,
      similarTranslations,
      savedTranslation: savedTrans,
    },
  });
});

exports.getUserTranslation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Find all saved translations for the logged-in user
  const savedTrans = await savedtransModel.find({ userId });

  // Format the response to include original text and its translation
  const translations = savedTrans.map((trans) => ({
    originalText: trans.text,
    translation: trans.translation,
    fromLang: trans.fromLang,
    toLang: trans.toLang,
    id: trans.id,
  }));

  res.status(200).json({
    status: "success",
    count: translations.length,
    data: translations,
  });
});

exports.getFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Find all saved translations for the logged-in user with favorites set to true
  const favorites = await savedtransModel.find({ userId, isFavorite: true });

  // Format the response to include original text and its translation
  const favoriteTranslations = favorites.map((trans) => ({
    id: trans.id,
    originalText: trans.text,
    translation: trans.translation,
  }));

  res.status(200).json({
    status: "success",
    count: favoriteTranslations.length,
    data: favoriteTranslations,
  });
});

exports.deleteTranslationById = factory.deleteOne(savedtransModel);
exports.getalltranslations = factory.getAll(savedtransModel);

const suggestSimilarTranslations = async (newTranslation) => {
  const similarTranslations = await savedtransModel
    .find({
      $text: { $search: newTranslation.text },
      fromLang: newTranslation.fromLang,
      toLang: newTranslation.toLang,
      _id: { $ne: newTranslation._id },
    })
    .select("text translation")
    .limit(5);
  return similarTranslations;
};

//search and filter
exports.searchAndFilterTranslations = async (req, res) => {
  try {
    const { keyword, fromLang, toLang, startDate, endDate, isFavorite } =
      req.query;

    const query = { userId: req.user.id }; // Match only translations for the authenticated user

    if (keyword) {
      query.$text = { $search: keyword };
    }

    if (fromLang) {
      query.fromLang = fromLang; // Filter by source language
    }

    if (toLang) {
      query.toLang = toLang; // Filter by target language
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate); // Start date
      if (endDate) query.createdAt.$lte = new Date(endDate); // End date
    }

    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite === "true";
    }

    translations = await savedtransModel.find(query);

    res.status(200).json({
      status: "success",
      results: translations.length,
      data: translations,
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};
const getTranslationStats = async (userId) => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailyStats = await savedtransModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfDay },
      },
    },
    { $group: { _id: "$toLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { toLang: "$_id", count: "$count" },
        },
        dailyTotal: { $sum: "$count" },
      },
    },
  ]);

  const weeklyStats = await savedtransModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId), // Corrected
        createdAt: { $gte: startOfWeek },
      },
    },
    { $group: { _id: "$toLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { toLang: "$_id", count: "$count" },
        },
        weeklyTotal: { $sum: "$count" },
      },
    },
  ]);

  const monthlyStats = await savedtransModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId), // Corrected
        createdAt: { $gte: startOfMonth },
      },
    },
    { $group: { _id: "$toLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { toLang: "$_id", count: "$count" },
        },
        monthlyTotal: { $sum: "$count" },
      },
    },
  ]);

  const mostSelectedLanguages = await savedtransModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Corrected
    {
      $group: {
        _id: { fromLang: "$fromLang", toLang: "$toLang" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 2 },
  ]);

  return {
    daily: dailyStats[0] || { translations: [], total: 0 },
    weekly: weeklyStats[0] || { translations: [], total: 0 },
    monthly: monthlyStats[0] || { translations: [], total: 0 },
    mostSelectedLanguages:
      mostSelectedLanguages.length > 0 ? mostSelectedLanguages : [],
  };
};

exports.getTranslationHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const stats = await getTranslationStats(userId);

  res.status(200).json({
    status: "success",
    data: stats,
  });
});

//SORTING
exports.getFavoritesInOrder = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy = "text", sortOrder = "asc" } = req.query; // Default sorting by text in ascending order

  // Define sorting options
  let sortOptions = {};
  if (sortBy === "text") {
    sortOptions.text = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "createdAt") {
    sortOptions.createdAt = sortOrder === "desc" ? -1 : 1;
  }

  // Fetch and sort favorite translations
  const favorites = await savedtransModel
    .find({ userId, isFavorite: true })
    .collation({ locale: "en", strength: 2 }) // Case-insensitive sorting
    .sort(sortOptions);

  // Format the response data
  const favoriteTranslations = favorites.map((trans) => ({
    id: trans.id,
    originalText: trans.text.trim(), // Ensure trimmed output
    translation: trans.translation,
    createdAt: trans.createdAt,
  }));

  // Return sorted favorites
  res.status(200).json({
    status: "success",
    count: favoriteTranslations.length,
    data: favoriteTranslations,
  });
});
