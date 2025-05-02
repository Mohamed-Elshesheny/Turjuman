const catchAsync = require("express-async-handler");

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
  const userId = req.user.id;

  // Retrieve all saved translations for the logged-in user
  const savedTrans = await savedtransModel
    .find({ userId })
    .sort({ createdAt: -1 });

  // Format the response to include original text and its translation
  const translations = savedTrans.map((trans) => ({
    id: trans.id,
    original: trans.word,
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
