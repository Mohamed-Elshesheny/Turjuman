const AppError = require("../../utils/AppError");
const TranslationCache = require("./cacheService");
const { checkGuestLimit } = require("./translationLimiter");
const catchAsync = require("express-async-handler");
const { findExistingTranslation, saveTranslation } = require("./dbService");
const translateWordExternally = require("../../utils/TranslateModel");

// Helper: Build cache key dynamically
const buildCacheKey = (tier, word, srcLang, targetLang) =>
  `${tier}cache:translation:${word}:${srcLang}:${targetLang}`;

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
const buildDictionaryData = (translationData, fallbackExamples) => ({
  definition: translationData.definition,
  examples:
    Array.isArray(translationData.examples) &&
    translationData.examples.length > 0
      ? translationData.examples
      : fallbackExamples,
  synonyms_src: translationData.synonyms_src,
  synonyms_target: translationData.synonyms_target,
});

// exports.translateAndSave = catchAsync(async (req, res, next) => {
//   let { word, context, srcLang, targetLang, isFavorite = false } = req.body;

//   validateTranslationInput(word, srcLang, targetLang, next);

//   const hotCacheKey = buildCacheKey("hot", word, srcLang, targetLang);
//   const warmCacheKey = buildCacheKey("warm", word, srcLang, targetLang);
//   const coldCacheKey = buildCacheKey("cold", word, srcLang, targetLang);
//   const cacheManager = new TranslationCache(
//     hotCacheKey,
//     warmCacheKey,
//     coldCacheKey
//   );

//   const cachedTranslation = await cacheManager.getCachedTranslation(word);
//   if (cachedTranslation) {
//     return res.status(200).json({
//       success: true,
//       data: {
//         id: cachedTranslation.id,
//         ...cachedTranslation,
//         source: cachedTranslation.source || "cache",
//       },
//     });
//   }

//   const translationData = await translateWordExternally(
//     word,
//     context,
//     srcLang,
//     targetLang
//   );

//   if (!translationData.success) {
//     return handleTranslationError(translationData, res);
//   }

//   const translation = translationData.translation;
//   const userId = req.user ? req.user.id : null;

//   const fallbackExamples = [
//     `Try using "${word}" in a sentence.`,
//     `"${word}" can have different meanings depending on context.`,
//     `Learn how to say "${word}" in different situations.`,
//   ];

//   if (!userId) {
//     const limitResult = checkGuestLimit(req, word, translation);
//     return res.status(limitResult.response.status).json(limitResult.response);
//   }

//   if (!isSingleWord(word)) {
//     return res.status(200).json({
//       success: true,
//       data: {
//         original: word,
//         translation,
//         message: "Translation completed (not saved - full sentence)",
//       },
//     });
//   }

//   const existingTranslation = await findExistingTranslation(
//     word,
//     srcLang,
//     targetLang,
//     userId
//   );

//   const dictionaryData = buildDictionaryData(translationData, fallbackExamples);

//   if (existingTranslation) {
//     return res.status(200).json({
//       success: true,
//       message: "Translation already exists",
//       data: {
//         original: word,
//         translation: existingTranslation.translation,
//         isFavorite: existingTranslation.isFavorite,
//         definition: dictionaryData.definition,
//         examples: dictionaryData.examples,
//         synonyms_src: dictionaryData.synonyms_src,
//         synonyms_target: dictionaryData.synonyms_target,
//       },
//     });
//   }

//   const savedTrans = await saveTranslation({
//     word,
//     srcLang,
//     targetLang,
//     translation,
//     userId,
//     isFavorite,
//     examples: dictionaryData.examples,
//     definition: dictionaryData.definition,
//     synonyms_src: dictionaryData.synonyms_src,
//     synonyms_target: dictionaryData.synonyms_target,
//   });

//   await cacheManager.saveToCache(word, dictionaryData, savedTrans);
//   console.log(`[CACHE MISS] Saved "${word}" → "${translation}" to cache`);

//   res.status(200).json({
//     success: true,
//     data: {
//       original: word,
//       level: savedTrans.level,
//       translation,
//       definition: dictionaryData.definition,
//       examples: dictionaryData.examples,
//       synonyms_src: dictionaryData.synonyms_src,
//       synonyms_target: dictionaryData.synonyms_target,
//       savedTranslation: savedTrans,
//     },
//   });
// });
exports.translateAndSave = catchAsync(async (req, res, next) => {
  let { word, context, srcLang, targetLang, isFavorite = false } = req.body;
  if (!context || context.trim() === "") {
    context = word;
  }

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
      word: cachedTranslation.word,
      translated_word: cachedTranslation.translation,
      definition: cachedTranslation.definition,
      examples: cachedTranslation.examples,
      synonymsSrc: cachedTranslation.synonymsSrc,
      synonymsTarget: cachedTranslation.synonymsTarget,
      source: cachedTranslation.source || "cache",
    });
  }

  const translationData = await translateWordExternally(
    word,
    context,
    srcLang,
    targetLang
  );

  if (!translationData) {
    return res.status(500).json({
      success: false,
      message: "Translation failed (no data)",
    });
  }

  const translation = translationData.translation;
  const userId = req.user ? req.user.id : null;

  const fallbackExamples = [
    `Try using "${word}" in a sentence.`,
    `"${word}" can have different meanings depending on context.`,
    `Learn how to say "${word}" in different situations.`,
  ];

  if (!userId) {
    const limitResult = checkGuestLimit(req, word, translation);
    return res.status(limitResult.response.status).json(limitResult.response);
  }

  if (!isSingleWord(word)) {
    return res.status(200).json({
      success: true,
      word,
      translated_word: translation,
      definition: translationData.definition,
      examples:
        translationData.examples.length > 0
          ? translationData.examples
          : fallbackExamples,
      synonymsSrc: translationData.synonymsSrc || [],
      synonymsTarget: translationData.synonymsTarget || [],
      message: "Translation completed (not saved - full sentence)",
    });
  }

  const existingTranslation = await findExistingTranslation(
    word,
    srcLang,
    targetLang,
    userId
  );

  // ✅ We use the data directly instead of `buildDictionaryData` to match names
  const definition = translationData.definition;
  const examples =
    translationData.examples && translationData.examples.length > 0
      ? translationData.examples
      : fallbackExamples;
  const synonymsSrc = translationData.synonymsSrc || [];
  const synonymsTarget = translationData.synonymsTarget || [];

  if (existingTranslation) {
    return res.status(200).json({
      success: true,
      message: "Translation already exists",
      word,
      translated_word: existingTranslation.translation,
      definition,
      examples,
      synonymsSrc,
      synonymsTarget,
    });
  }

  const savedTrans = await saveTranslation({
    word,
    srcLang,
    targetLang,
    translation,
    userId,
    isFavorite,
    examples,
    definition,
    synonyms_src: synonymsSrc, // saving in DB? keep snake_case if needed
    synonyms_target: synonymsTarget,
  });

  await cacheManager.saveToCache(
    word,
    {
      definition,
      examples,
      synonymsSrc,
      synonymsTarget,
    },
    savedTrans
  );

  console.log(`[CACHE MISS] Saved "${word}" → "${translation}" to cache`);

  res.status(200).json({
    success: true,
    word,
    translated_word: translation,
    definition,
    examples,
    synonymsSrc,
    synonymsTarget,
    savedTranslation: savedTrans,
  });
});
