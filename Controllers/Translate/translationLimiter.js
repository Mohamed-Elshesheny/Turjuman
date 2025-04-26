const savedtransModel = require("../../Models/savedtransModel");
const catchAsync = require("express-async-handler");

const checkGuestLimit = (req, word, translation) => {
  const GUEST_TRANSLATION_LIMIT = process.env.GUEST_LIMIT || 2;

  if (!req.session.guestTranslationCount) req.session.guestTranslationCount = 0;

  if (req.session.guestTranslationCount >= GUEST_TRANSLATION_LIMIT) {
    return {
      allowed: false,
      response: {
        success: false,
        status: 403,
        message: `You have reached the maximum limit of ${GUEST_TRANSLATION_LIMIT} translations as a guest. Please log in for more translations.`,
      },
    };
  }

  req.session.guestTranslationCount += 1;

  return {
    allowed: true,
    response: {
      success: true,
      status: 200,
      data: {
        original: word,
        translation,
        count: req.session.guestTranslationCount,
      },
    },
  };
};

const checkTranslationLimit = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));

  const translationCount = await savedtransModel.countDocuments({
    userId: userId,
    createdAt: { $gte: startOfDay },
  });

  const limit = process.env.TRANSLATION_LIMIT || 100;

  if (translationCount >= limit) {
    return res.status(429).json({
      success: false,
      message: "You have reached your daily translation limit.",
    });
  }

  next();
});

module.exports = { checkGuestLimit, checkTranslationLimit };
