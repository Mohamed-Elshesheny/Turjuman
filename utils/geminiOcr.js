const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// 📝 استخراج النص من الصورة
async function extractTextWithGemini(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
    "Extract **all visible text** from this image **exactly as it appears**, without summarizing or interpreting.",
  ]);

  return result.response.text();
}

// 🌐 ترجمة النص باستخدام Gemini API بشكل ديناميك
async function translateText(text, srcLang = "english", targetLang = "arabic") {
  const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
  You are a professional translator. Translate the following text from ${srcLang} into ${targetLang}, without altering the meaning or summarizing it.

  Text: "${text}"

  ### Output:
  { "translation": "<translated_text>" }
  `;

  const result = await model.generateContent(prompt);
  const rawJson = await result.response.text();
  const json = JSON.parse(rawJson.trim().replace(/```json|```/g, ""));
  return json.translation;
}

// 🚀 معالجة الصورة والترجمة معاً
async function processImageTranslation(
  imagePath,
  srcLang = "english",
  targetLang = "arabic"
) {
  try {
    const extractedText = await extractTextWithGemini(imagePath);
    console.log("Extracted Text:", extractedText);

    const translatedText = await translateText(
      extractedText,
      srcLang,
      targetLang
    );
    console.log("Translated Text:", translatedText);

    return {
      original_text: extractedText,
      translated_text: translatedText,
    };
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
}

// 🆕 استخراج وترجمة بشكل عام
async function extractAndTranslate(
  imagePath,
  srcLang = "english",
  targetLang = "arabic"
) {
  const extractedText = await extractTextWithGemini(imagePath);
  const translatedText = await translateText(
    extractedText,
    srcLang,
    targetLang
  );
  return {
    original_text: extractedText,
    translated_text: translatedText,
  };
}

module.exports = {
  extractTextWithGemini,
  translateText,
  processImageTranslation,
  extractAndTranslate,
};
