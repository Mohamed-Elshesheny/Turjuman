const mongoose = require("mongoose");
const session = require("express-session");
const catchAsync = require("express-async-handler");
const gemineiTranslate = require("../utils/geminiTranslate");
const model = require("../utils/geminiModel");
const AppError = require("../utils/AppError");
const savedtransModel = require("../Models/savedtransModel");
const userModel = require("../Models/userModel");
const APIfeatures = require("../utils/ApiFeaturs");
const factory = require("../Controllers/handerController");

// Suggest similar translations using Gemini AI semantic similarity
const suggestSimilarTranslations = async (newTranslation) => {
  const potentialTranslations = await savedtransModel.find({
    srcLang: newTranslation.srcLang,
    targetLang: newTranslation.targetLang,
    _id: { $ne: newTranslation._id },
  }).select("word translation");

  const similarTranslations = [];

  for (const trans of potentialTranslations) {
    try {
      const prompt = `
        Compare the semantic similarity between the following two words in the context of translation from ${newTranslation.srcLang} to ${newTranslation.targetLang}. Respond with a JSON object {"similar": true/false, "reason": "short explanation"}.

        Word 1: ${newTranslation.word}
        Word 2: ${trans.word}
      `;
      const result = await model.generateContent(prompt);
      const rawJson = await result.response.text();
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      let json = {};
      if (jsonMatch) {
        json = JSON.parse(jsonMatch[0]);
      }
      if (json.similar) {
        similarTranslations.push({
          ...trans._doc,
          similarityReason: json.reason,
        });
      }
    } catch (err) {
      console.error(`Error comparing ${newTranslation.word} with ${trans.word}:`, err.message);
    }
  }

  return similarTranslations.slice(0, 5);
};

exports.checkTranslationLimit = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next();
  }
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

exports.translateAndSave = catchAsync(async (req, res, next) => {
  let { word, paragraph, srcLang, targetLang, isFavorite = false } = req.body;

  if (!word || !srcLang || !targetLang) {
    return next(
      new AppError("Please provide word, srcLang , and targetLang 😃", 400)
    );
  }

  const translationData = await gemineiTranslate(word, paragraph, srcLang, targetLang);

  if (!translationData.success) {
    return res.status(200).json({
      success: false,
      message: translationData.error || "Can't find a proper translation",
    });
  }

  const translation = translationData.translation;

  const userId = req.user ? req.user.id : null;

  // Guest user translation limit
  const GUEST_TRANSLATION_LIMIT = process.env.GUEST_LIMIT || 2;
  if (!userId) {
    if (!req.session.guestTranslationCount)
      req.session.guestTranslationCount = 0;

    if (req.session.guestTranslationCount >= GUEST_TRANSLATION_LIMIT) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum limit of ${GUEST_TRANSLATION_LIMIT} translations as a guest. Please log in for more translations.`,
      });
    }

    req.session.guestTranslationCount += 1;
    console.log(`[Translation] User Guest translated "${word}" → "${translation}"`);
    return res.status(200).json({
      success: true,
      data: {
        original: word,
        translation,
        count: req.session.guestTranslationCount,
      },
    });
  }

  // Check if translation already exists in the database
  const existingTranslation = await savedtransModel.findOne({
    word,
    srcLang,
    targetLang,
    userId,
  });

  if (existingTranslation) {
    // جلب بيانات AI للتعريف والمرادفات
    const aiData = await gemineiTranslate(word, paragraph, srcLang, targetLang);

    if (!aiData.success) {
      return res.status(200).json({
        success: false,
        message: aiData.error || "Can't find a proper translation",
      });
    }

    console.log(`[Translation] User ${userId} translated "${word}" → "${existingTranslation.translation}" (existing)`);
    return res.status(200).json({
      success: true,
      message: "Translation already exists",
      data: {
        original: word,
        translation: existingTranslation.translation,
        isFavorite: existingTranslation.isFavorite,
        definition: aiData.definition,
        examples: aiData.examples,
        synonyms_src: aiData.synonyms_src,
        synonyms_target: aiData.synonyms_target,
      },
    });
  }

  // Save new translation to the database
  const savedTrans = await savedtransModel.create({
    word,
    srcLang,
    targetLang,
    translation,
    userId,
    isFavorite,
  });

  const similarTranslations = await suggestSimilarTranslations(savedTrans);

  const dictionaryData = {
    definition: translationData.definition,
    examples: translationData.examples,
    synonyms_src: translationData.synonyms_src,
    synonyms_target: translationData.synonyms_target,
  };

  console.log(`[Translation] User ${userId} translated "${word}" → "${translation}"`);

  // Respond with updated format
  res.status(200).json({
    success: true,
    data: {
      original: word,
      translation,
      definition: dictionaryData.definition,
      examples: dictionaryData.examples,
      synonyms_src: dictionaryData.synonyms_src,
      synonyms_target: dictionaryData.synonyms_target,
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
    originalText: trans.word,
    translation: trans.translation,
    srcLang: trans.srcLang,
    targetLang: trans.targetLang,
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
    originalText: trans.word,
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

//search and filter
exports.searchAndFilterTranslations = async (req, res) => {
  try {
    const { keyword, srcLang, targetLang, startDate, endDate, isFavorite } =
      req.query;

    const query = { userId: req.user.id }; // Match only translations for the authenticated user

    if (keyword) {
      query.$text = { $search: keyword };
    }

    if (srcLang) {
      query.srcLang = srcLang; // Filter by source language
    }

    if (targetLang) {
      query.targetLang = targetLang; // Filter by target language
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
    { $group: { _id: "$targetLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { targetLang: "$_id", count: "$count" },
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
    { $group: { _id: "$targetLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { targetLang: "$_id", count: "$count" },
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
    { $group: { _id: "$targetLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { targetLang: "$_id", count: "$count" },
        },
        monthlyTotal: { $sum: "$count" },
      },
    },
  ]);

  const mostSelectedLanguages = await savedtransModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Corrected
    {
      $group: {
        _id: { srcLang: "$srcLang", targetLang: "$targetLang" },
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
    originalText: trans.word.trim(), // Ensure trimmed output
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
