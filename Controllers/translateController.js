const catchAsync = require("express-async-handler");
const jwt = require("jsonwebtoken");

// Models 📦
const savedtransModel = require("../Models/savedtransModel");

// Services & Queries 🔧
const { translateAndSave } = require("./Translate/translateService");
const { getTranslationHistory } = require("./Translate/statsService");
const { checkTranslationLimit } = require("./Translate/translationLimiter");
const { ocrTranslateImage } = require("./Translate/ocrService");
const { translateFile } = require("./Translate/fileTranslateService");
const {
  searchAndFilterTranslations,
  userTanslations,
  getFavoritesInOrder,
  markAsFavoriteById,
} = require("./Translate/translationQueries");

// Factory functions 🏭
const factory = require("../Controllers/handerController");

// ===================== Translation Logic 📝 =====================

exports.checkTranslationLimit = checkTranslationLimit;

exports.getUserTranslation = catchAsync(async (req, res, next) => {
  // بنحاول نجيب التوكن سواء من الهيدر أو الكوكي
  let token = req.headers.authorization?.startsWith("Bearer")
    ? req.headers.authorization.split(" ")[1]
    : req.cookies?.jwt;
  console.log("🔑 Token extracted:", token);

  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      console.log("Invalid token:", err.message);
    }
  }

  // لو فيه يوزر جيب ترجماته، لو مفيش هات العامة
  const query = userId ? { userId } : { isPublic: true };

  const translations = await savedtransModel
    .find(query)
    .sort({ createdAt: -1 });

  if (!translations || translations.length === 0) {
    return res.status(200).json({
      status: "success",
      data: [],
      count: 0,
      message: "No translations found",
    });
  }

  const result = translations.map((t) => ({
    id: t.id,
    original: t.word,
    translation: t.translation,
    srcLang: t.srcLang,
    targetLang: t.targetLang,
    definition: t.definition,
    synonyms_src: t.synonyms_src,
    synonyms_target: t.synonyms_target,
  }));

  res.status(200).json({
    status: "success",
    count: result.length,
    data: result,
  });
});

// ===================== Favorites ⭐ =====================

exports.getFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Retrieve all favorite translations for the logged-in user, sorted by newest
  const favorites = await savedtransModel
    .find({ userId, isFavorite: true })
    .sort({ createdAt: -1 });

  // Format the response with detailed favorite translations
  const favoriteTranslations = favorites.map((trans) => ({
    id: trans.id,
    original: trans.word,
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

// ===================== File Translation 📁 =====================

exports.translateFile = translateFile;

// ===================== OCR Translation 📷 =====================

exports.ocrTranslateImage = ocrTranslateImage;

// ===================== Translation Queries & Utilities 🔍 =====================

exports.getFavoritesInOrder = getFavoritesInOrder;
exports.markAsFavoriteById = markAsFavoriteById;
exports.searchAndFilterTranslations = searchAndFilterTranslations;
exports.userTanslations = userTanslations;

// ===================== Factory Handlers 🏗 =====================

exports.deleteTranslationById = factory.deleteOne(savedtransModel);
exports.getalltranslations = factory.getAll(savedtransModel);

// ===================== Other Services 🚀 =====================

exports.translateAndSave = translateAndSave;
exports.getTranslationHistory = getTranslationHistory;
