const extractAndTranslate = require("../../utils/OcrModel");
const catchAsync = require("express-async-handler");

exports.ocrTranslateImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No image file provided", 400));
  }

  const imageBuffer = req.file.buffer;
  const srcLang = req.body.srcLang;
  const targetLang = req.body.targetLang;

  if (srcLang === targetLang) {
    return next(
      new AppError("Source and target languages cannot be the same", 400)
    );
  }

  const result = await extractAndTranslate(imageBuffer, srcLang, targetLang);

  if (!result || !result.translation) {
    return next(new AppError("Failed to translate image text", 500));
  }

  res.status(200).json({
    success: true,
    data: {
      original_text: result.originalText,
      translated_text: result.translation,
    },
  });
});
