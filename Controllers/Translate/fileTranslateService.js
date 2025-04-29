const path = require("path");
const mammoth = require("mammoth"); //Read text from Docx
const AppError = require("../../utils/AppError");
const {
  translateParagraph,
  splitText,
  cloudinary,
} = require("../../utils/geminiDoc");
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

  const filePath = req.file.buffer;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  let fileContent = "";

  if (ext === ".txt") {
    fileContent = filePath.toString("utf-8");
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    fileContent = result.value;
  } else {
    return next(new AppError("Unsupported file type ❌", 400));
  }

  const uploadedFile = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: "raw", use_filename: true, folder: "turjuman_files" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(req.file.buffer);
  });

  const uploadedUrl = uploadedFile.secure_url;

  const chunks = splitText(fileContent, 400, 20);

  const translations = [];

  for (let i = 0; i < Math.min(chunks.length, 3); i++) {
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

  const response = {
    success: true,
    total: translations.length,
    data: translations,
  };

  if (process.env.NODE_ENV === "development") {
    response.file_url = uploadedUrl;
  }

  res.status(200).json(response);
});

module.exports = { translateFile };
