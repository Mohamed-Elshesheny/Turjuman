const savedtransModel = require("../../Models/savedtransModel");
const catchAsync = require("express-async-handler");
const AppError = require("../../utils/AppError");

exports.searchAndFilterTranslations = async (req, res) => {
  try {
    const { keyword, srcLang, targetLang, startDate, endDate, isFavorite } =
      req.query;

    const query = { userId: req.user.id };

    if (keyword) {
      query.$text = { $search: keyword };
    }

    if (srcLang) {
      query.srcLang = srcLang;
    }

    if (targetLang) {
      query.targetLang = targetLang;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite === "true";
    }

    const translations = await savedtransModel.find(query);

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

exports.userTanslations = async (req, res) => {
  try {
    const query = { userId: req.user.id };
    const translations = await savedtransModel
      .find(query)
      .sort({ createdAt: -1 });

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

exports.getFavoritesInOrder = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy = "text", sortOrder = "asc" } = req.query;

  let sortOptions = {};
  if (sortBy === "text") {
    sortOptions.text = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "createdAt") {
    sortOptions.createdAt = sortOrder === "desc" ? -1 : 1;
  }

  const favorites = await savedtransModel
    .find({ userId, isFavorite: true })
    .collation({ locale: "en", strength: 2 })
    .sort(sortOptions);

  const favoriteTranslations = favorites.map((trans) => ({
    id: trans.id,
    originalText: trans.word.trim(),
    translation: trans.translation,
    createdAt: trans.createdAt,
  }));

  res.status(200).json({
    status: "success",
    count: favoriteTranslations.length,
    data: favoriteTranslations,
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

exports.unMakrFavoriteById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const translation = await savedtransModel.findOne({ _id: id, userId });

  if (!translation) {
    return next(
      new AppError("Translation not found or you don't have permission.", 404)
    );
  }

  translation.isFavorite = false;
  await translation.save();

  res.status(200).json({
    success: true,
    message: "Translation unMarked as favorite ✅",
  });
});
