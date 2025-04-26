const path = require("path");
const fs = require("fs/promises");
const mammoth = require("mammoth");
const AppError = require("../../utils/AppError");
const { translateParagraph, splitText } = require("../../utils/geminiDoc");
const catchAsync = require("express-async-handler");

const translateFile = catchAsync(async (req, res, next) => {
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

module.exports = { translateFile };
