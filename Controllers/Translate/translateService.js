const AppError = require("../../utils/AppError");
const TranslationCache = require("./cacheService");
// Helper: Build cache key dynamically
const buildCacheKey = (tier, word, srcLang, targetLang) =>
  `${tier}cache:translation:${word}:${srcLang}:${targetLang}`;
const { checkGuestLimit } = require("./translationLimiter");
const catchAsync = require("express-async-handler");
const { findExistingTranslation, saveTranslation } = require("./dbService");
const gemineiTranslate = require("../../utils/geminiTranslate");

// Helper: Validate required translation inputs 🚦
const validateTranslationInput = (word, srcLang, targetLang, next) => {
  if (!word || !srcLang || !targetLang) {
    return next(
      new AppError("Please provide word, srcLang , and targetLang 😃", 400)
    );
  }
};

// Helper: Handle translation errors from service 🚫
const handleTranslationError = (translationData, res) => {
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
};

// Helper: Check if word is single word 📝
const isSingleWord = (word) => word.trim().split(/\s+/).length === 1;

// Helper: Build dictionary data 📚
const buildDictionaryData = (translationData) => ({
  definition: translationData.definition,
  examples: translationData.examples,
  synonyms_src: translationData.synonyms_src,
  synonyms_target: translationData.synonyms_target,
});

exports.translateAndSave = catchAsync(async (req, res, next) => {
  let { word, paragraph, srcLang, targetLang, isFavorite = false } = req.body;

  validateTranslationInput(word, srcLang, targetLang, next);

  const hotCacheKey = buildCacheKey("hot", word, srcLang, targetLang);
  const warmCacheKey = buildCacheKey("warm", word, srcLang, targetLang);
  const coldCacheKey = buildCacheKey("cold", word, srcLang, targetLang);
  const cacheManager = new TranslationCache(
    hotCacheKey,
    warmCacheKey,
    coldCacheKey
  );

  const cachedTranslation = await cacheManager.getCachedTranslation(word);

  if (cachedTranslation) {
    return res.status(200).json({
      success: true,
      data: {
        id: cachedTranslation.id,
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
    return handleTranslationError(translationData, res);
  }

  const translation = translationData.translation;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    const limitResult = checkGuestLimit(req, word, translation);
    return res.status(limitResult.response.status).json(limitResult.response);
  }
  if (!isSingleWord(word)) {
    return res.status(200).json({
      success: true,
      data: {
        original: word,
        translation,
        message: "Translation completed (not saved - full sentence)",
      },
    });
  }

  const existingTranslation = await findExistingTranslation(
    word,
    srcLang,
    targetLang,
    userId
  );

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

  const savedTrans = await saveTranslation({
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

  const dictionaryData = buildDictionaryData(translationData);

  await cacheManager.saveToCache(word, dictionaryData, savedTrans);
  console.log(`[CACHE MISS] Saved "${word}" → "${translation}" to cache`);

  res.status(200).json({
    success: true,
    data: {
      original: word,
      level: savedTrans.level,
      translation,
      definition: dictionaryData.definition,
      examples: dictionaryData.examples,
      synonyms_src: dictionaryData.synonyms_src,
      synonyms_target: dictionaryData.synonyms_target,
      savedTranslation: savedTrans,
    },
  });
});
