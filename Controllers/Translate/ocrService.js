const AppError = require("../../utils/AppError");
const { extractAndTranslate } = require("../../utils/geminiOcr");
const catchAsync = require("express-async-handler");

const ocrTranslateImage = catchAsync(async (req, res, next) => {
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

module.exports = { ocrTranslateImage };
