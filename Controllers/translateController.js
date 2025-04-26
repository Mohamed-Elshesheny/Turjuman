const path = require("path");
const fs = require("fs/promises");
const mammoth = require("mammoth");
const { translateParagraph, splitText } = require("../utils/geminiDoc");
const { extractAndTranslate } = require("../utils/geminiOcr");
const redisClient = require("../utils/redisClient"); // تأكد من استيراد Redis Client
const mongoose = require("mongoose");
const catchAsync = require("express-async-handler");
const gemineiTranslate = require("../utils/geminiTranslate");
const model = require("../utils/geminiModel");
const AppError = require("../utils/AppError");
const savedtransModel = require("../Models/savedtransModel");
const userModel = require("../Models/userModel");
const factory = require("../Controllers/handerController");

const parseGeminiJson = (rawText) => {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return {};
};

// Suggest similar translations using Gemini AI semantic similarity
const suggestSimilarTranslations = async (newTranslation) => {
  const potentialTranslations = await savedtransModel
    .find({
      srcLang: newTranslation.srcLang,
      targetLang: newTranslation.targetLang,
      _id: { $ne: newTranslation._id },
    })
    .select("word translation");

  const similarityPromises = potentialTranslations.map(async (trans) => {
    try {
      const prompt = `
        Compare the semantic similarity between the following two words in the context of translation from ${newTranslation.srcLang} to ${newTranslation.targetLang}. Respond with a JSON object {"similar": true/false, "reason": "short explanation"}.

        Word 1: ${newTranslation.word}
        Word 2: ${trans.word}
      `;
      const result = await model.generateContent(prompt);
      const rawJson = await result.response.text();
      const json = parseGeminiJson(rawJson);
      if (json.similar) {
        return {
          ...trans._doc,
          similarityReason: json.reason,
        };
      }
    } catch (err) {
      console.error(
        `Error comparing ${newTranslation.word} with ${trans.word}:`,
        err.message
      );
    }
    return null;
  });

  const allResults = await Promise.all(similarityPromises);
  return allResults.filter((res) => res !== null).slice(0, 5);
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

  const hotCacheKey = `hotcache:translation:${word}:${srcLang}:${targetLang}`;
  const warmCacheKey = `warmcache:translation:${word}:${srcLang}:${targetLang}`;
  const coldCacheKey = `coldcache:translation:${word}:${srcLang}:${targetLang}`;
  const cachedTranslation = await getCachedTranslation(
    hotCacheKey,
    warmCacheKey,
    coldCacheKey,
    word
  );

  if (cachedTranslation) {
    return res.status(200).json({
      success: true,
      data: {
        ...cachedTranslation,
        source: cachedTranslation.source || "cache",
      },
    });
  }

  const translationData = await gemineiTranslate(
    word,
    paragraph,
    srcLang,
    targetLang
  );

  if (!translationData.success) {
    const fallbackMessage =
      translationData.error && translationData.error.includes("quota")
        ? "⚠️ Translation service is temporarily unavailable due to rate limits. Please try again in a minute."
        : "❌ Can't find a proper translation";

    console.error("[TRANSLATION ERROR]", translationData.error);
    return res
      .status(
        translationData.error && translationData.error.includes("quota")
          ? 503
          : 500
      )
      .json({
        success: false,
        message: fallbackMessage,
        error: translationData.error || "Unknown error occurred",
        fallback:
          translationData.error && translationData.error.includes("quota"),
        details: translationData,
      });
  }

  const translation = translationData.translation;
  const userId = req.user ? req.user.id : null;

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
    console.log(
      `[Translation] User Guest translated "${word}" → "${translation}"`
    );
    return res.status(200).json({
      success: true,
      data: {
        original: word,
        translation,
        count: req.session.guestTranslationCount,
      },
    });
  }
  const isSingleWord = word.trim().split(/\s+/).length === 1;
  // Skip saving if not a single word
  if (!isSingleWord) {
    return res.status(200).json({
      success: true,
      data: {
        original: word,
        translation,
        message: "Translation completed (not saved - full sentence)",
      },
    });
  }

  const existingTranslation = await savedtransModel.findOne({
    word,
    srcLang,
    targetLang,
    userId,
  });

  if (existingTranslation) {
    const aiData = translationData;

    if (!aiData.success) {
      return res.status(200).json({
        success: false,
        message: aiData.error || "Can't find a proper translation",
      });
    }

    console.log(
      `[Translation] User ${userId} translated "${word}" → "${existingTranslation.translation}" (existing)`
    );
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

  const savedTrans = await savedtransModel.create({
    word,
    srcLang,
    targetLang,
    translation,
    userId,
    isFavorite,
    definition: translationData.definition,
    synonyms_src: translationData.synonyms_src,
    synonyms_target: translationData.synonyms_target,
  });

  const similarTranslations = await suggestSimilarTranslations(savedTrans);

  const dictionaryData = {
    definition: translationData.definition,
    examples: translationData.examples,
    synonyms_src: translationData.synonyms_src,
    synonyms_target: translationData.synonyms_target,
  };

  await redisClient.hSet(
    hotCacheKey,
    word,
    JSON.stringify({
      original: word,
      translation,
      definition: dictionaryData.definition,
      examples: dictionaryData.examples,
      synonyms_src: dictionaryData.synonyms_src,
      synonyms_target: dictionaryData.synonyms_target,
    })
  );
  await redisClient.expire(hotCacheKey, 3600); // 1 ساعة

  await redisClient.hSet(
    warmCacheKey,
    word,
    JSON.stringify({
      original: word,
      translation,
      definition: dictionaryData.definition,
      examples: dictionaryData.examples,
      synonyms_src: dictionaryData.synonyms_src,
      synonyms_target: dictionaryData.synonyms_target,
    })
  );
  await redisClient.expire(warmCacheKey, 86400); // 24 ساعة

  await redisClient.hSet(
    coldCacheKey,
    word,
    JSON.stringify({
      original: word,
      translation,
      definition: dictionaryData.definition,
      examples: dictionaryData.examples,
      synonyms_src: dictionaryData.synonyms_src,
      synonyms_target: dictionaryData.synonyms_target,
    })
  );
  await redisClient.expire(coldCacheKey, 604800); // 7 أيام

  console.log(`[CACHE MISS] Saved "${word}" → "${translation}" to cache`);

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
    definition: trans.definition,
    synonyms_src: trans.synonyms_src,
    synonyms_target: trans.synonyms_target,
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
  const favorites = await savedtransModel
    .find({ userId, isFavorite: true })
    .sort({ createdAt: -1 });

  // Format the response to include original text and its translation
  const favoriteTranslations = favorites.map((trans) => ({
    id: trans.id,
    originalText: trans.word,
    translation: trans.translation,
    srcLang: trans.srcLang,
    targetLang: trans.targetLang,
    isFavorite: trans.isFavorite,
    createdAt: trans.createdAt,
    definition: trans.definition,
    synonyms_src: trans.synonyms_src,
    synonyms_target: trans.synonyms_target,
    examples: trans.examples,
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

  const calculatePercentages = (translations, total) => {
    return translations
      .map((t) => ({
        language: t.targetLang || t.language,
        count: t.count,
        percentage:
          total > 0 ? ((t.count / total) * 100).toFixed(2) + "%" : "0%",
      }))
      .sort((a, b) => b.count - a.count); // ترتيب تنازلي
  };

  return {
    dailyStats: {
      total: dailyStats[0]?.dailyTotal || 0,
      translations: calculatePercentages(
        dailyStats[0]?.translations || [],
        dailyStats[0]?.dailyTotal || 0
      ),
    },
    weeklyStats: {
      total: weeklyStats[0]?.weeklyTotal || 0,
      translations: calculatePercentages(
        weeklyStats[0]?.translations || [],
        weeklyStats[0]?.weeklyTotal || 0
      ),
    },
    monthlyStats: {
      total: monthlyStats[0]?.monthlyTotal || 0,
      translations: calculatePercentages(
        monthlyStats[0]?.translations || [],
        monthlyStats[0]?.monthlyTotal || 0
      ),
    },
    topLanguages: mostSelectedLanguages.map((l) => ({
      from: l._id.srcLang,
      to: l._id.targetLang,
      count: l.count,
    })),
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

// دالة جلب الكاش من hot/warm/cold cache
const getCachedTranslation = async (
  cacheKeyHot,
  cacheKeyWarm,
  cacheKeyCold,
  word
) => {
  let cachedTranslation = await redisClient.hGet(cacheKeyHot, word);
  if (cachedTranslation) {
    console.log(`[HOT CACHE HIT]`);
    return JSON.parse(cachedTranslation);
  }

  cachedTranslation = await redisClient.hGet(cacheKeyWarm, word);
  if (cachedTranslation) {
    console.log(`[WARM CACHE HIT]`);
    return JSON.parse(cachedTranslation);
  }

  cachedTranslation = await redisClient.hGet(cacheKeyCold, word);
  if (cachedTranslation) {
    console.log(`[COLD CACHE HIT]`);
    return JSON.parse(cachedTranslation);
  }

  return null;
};

exports.userTanslations = async (req, res) => {
  try {
    const {
      word,
      paragraph,
      srcLang,
      targetLang,
      startDate,
      endDate,
      isFavorite,
    } = req.query;

    const query = { userId: req.user.id };
    const translations = await savedtransModel
      .find(query)
      .sort({ createdAt: -1 }); // من الأحدث للأقدم

    res.status(200).json({
      status: "success",
      results: translations.length,
      data: translations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Server Error" });
  }
};

// OCR Translate Image Handler
exports.ocrTranslateImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No image file provided", 400));
  }

  const imagePath = req.file.path;
  const srcLang = req.body.srcLang;
  const targetLang = req.body.targetLang;
  console.log("Source Lang:", srcLang);
  console.log("Target Lang:", targetLang);

  if (srcLang === targetLang) {
    return next(
      new AppError("Source and target languages cannot be the same", 400)
    );
  }

  const result = await extractAndTranslate(imagePath, srcLang, targetLang);

  if (!result || !result.translated_text) {
    return next(new AppError("Failed to translate image text", 500));
  }

  res.status(200).json({
    success: true,
    data: {
      original_text: result.original_text,
      translated_text: result.translated_text,
    },
  });
});

exports.markAsFavoriteById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const translation = await savedtransModel
    .findOne({
      _id: id,
      userId,
    })
    .sort({ createdAt: -1 });

  if (!translation) {
    return next(
      new AppError("Translation not found or you don't have permission.", 404)
    );
  }

  translation.isFavorite = true;
  await translation.save();

  res.status(200).json({
    success: true,
    message: "Translation marked as favorite ✅",
    data: translation,
  });
});

// Translate uploaded text or docx file
exports.translateFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload a file 📄", 400));
  }

  const srcLang = req.body.srcLang;
  const targetLang = req.body.targetLang;

  if (!srcLang || !targetLang) {
    return next(new AppError("Please provide srcLang and targetLang 🌍", 400));
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  let fileContent = "";

  if (ext === ".txt") {
    fileContent = await fs.readFile(filePath, "utf-8");
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    fileContent = result.value;
  } else {
    return next(new AppError("Unsupported file type ❌", 400));
  }

  // Split text
  const chunks = splitText(fileContent, 400, 20);

  const translations = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const translated = await translateParagraph(
        chunks[i],
        srcLang,
        targetLang
      );
      translations.push({
        original: chunks[i],
        translation: translated,
      });
    } catch (err) {
      console.error(`Error translating chunk ${i + 1}:`, err.message);
    }
  }

  res.status(200).json({
    success: true,
    total: translations.length,
    data: translations,
  });
});
