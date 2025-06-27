// const fs = require("fs");
// const fetch = require("node-fetch");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const cloudinary = require("cloudinary").v2;

// cloudinary.config({
//   secure: true,
//   url: process.env.CLOUDINARY_URL,
// });

// const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // 🆕 رفع الصورة إلى كلاوديناري (يدعم Buffer)
// async function uploadToCloudinary(imageBuffer) {
//   return new Promise((resolve, reject) => {
//     cloudinary.uploader
//       .upload_stream({ resource_type: "image" }, (error, result) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve(result.secure_url);
//         }
//       })
//       .end(imageBuffer);
//   });
// }

// // 📝 استخراج النص من الصورة (يدعم URL كلاوديناري أو مسار محلي)
// async function extractTextWithGemini(imagePathOrUrl) {
//   if (!imagePathOrUrl) {
//     throw new Error("imagePathOrUrl is required");
//   }
//   let base64Image;

//   if (imagePathOrUrl.startsWith("http")) {
//     // Fetch from Cloudinary URL
//     const response = await fetch(imagePathOrUrl);
//     const buffer = await response.buffer();
//     base64Image = buffer.toString("base64");
//   } else {
//     // Local file path
//     const imageBuffer = fs.readFileSync(imagePathOrUrl);
//     base64Image = imageBuffer.toString("base64");
//   }

//   const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

//   const result = await model.generateContent([
//     { inlineData: { mimeType: "image/jpeg", data: base64Image } },
//     "Extract **all visible text** from this image **exactly as it appears**, without summarizing or interpreting.",
//   ]);

//   return result.response.text();
// }

// // 🌐 ترجمة النص باستخدام Gemini API بشكل ديناميك
// async function translateText(text, srcLang = "english", targetLang = "arabic") {
//   const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

//   const prompt = `
//   You are a professional translator. Translate the following text from ${srcLang} into ${targetLang}, without altering the meaning or summarizing it.

//   Text: "${text}"

//   ### Output:
//   { "translation": "<translated_text>" }
//   `;

//   const result = await model.generateContent(prompt);
//   const rawJson = result.response.text();
//   const json = JSON.parse(rawJson.trim().replace(/```json|```/g, ""));
//   return json.translation;
// }

// // 🚀 معالجة الصورة والترجمة معاً
// async function processImageTranslation(
//   imagePath,
//   srcLang = "english",
//   targetLang = "arabic"
// ) {
//   try {
//     const uploadedUrl = await uploadToCloudinary(imagePath);
//     console.log("Uploaded URL:", uploadedUrl);

//     const extractedText = await extractTextWithGemini(uploadedUrl);
//     console.log("Extracted Text:", extractedText);

//     const translatedText = await translateText(
//       extractedText,
//       srcLang,
//       targetLang
//     );
//     console.log("Translated Text:", translatedText);

//     return {
//       original_text: extractedText,
//       translated_text: translatedText,
//       image_url: uploadedUrl,
//     };
//   } catch (err) {
//     console.error("Error:", err);
//     throw err;
//   }
// }

// // 🆕 استخراج وترجمة بشكل عام
// async function extractAndTranslate(
//   imagePath,
//   srcLang = "english",
//   targetLang = "arabic"
// ) {
//   try {
//     const uploadedUrl = await uploadToCloudinary(imagePath);
//     console.log("Uploaded URL:", uploadedUrl);

//     const extractedText = await extractTextWithGemini(uploadedUrl);
//     console.log("Extracted Text:", extractedText);

//     const translatedText = await translateText(
//       extractedText,
//       srcLang,
//       targetLang
//     );
//     console.log("Translated Text:", translatedText);

//     return {
//       original_text: extractedText,
//       translated_text: translatedText,
//       image_url: uploadedUrl,
//     };
//   } catch (err) {
//     console.error("Error:", err);
//     throw err;
//   }
// }

// module.exports = {
//   extractTextWithGemini,
//   translateText,
//   processImageTranslation,
//   extractAndTranslate,
//   uploadToCloudinary,
// };
const axios = require("axios");
const FormData = require("form-data");

async function extractAndTranslate(
  buffer,
  srcLang = "english",
  targetLang = "arabic"
) {
  try {
    const form = new FormData();

    form.append("file", buffer, {
      filename: "image.jpg",
      contentType: "image/png",
    });

    form.append("srcLang", srcLang);
    form.append("targetLang", targetLang);

    const res = await axios.post(
      "https://turjuman-ocr-production.up.railway.app/ocr-translate",
      form,
      {
        headers: form.getHeaders(),
      }
    );

    const data = res.data;

    console.log("🔍 RAW OCR RESPONSE:", data);

    if (!data.english_text || !data.translated_text) {
      throw new Error("OCR translation failed - missing text fields");
    }

    return {
      originalText: data.english_text.replace(/\n/g, " "),
      translation: data.translated_text.replace(/\n/g, " "),
    };
  } catch (error) {
    console.error("❌ OCR API error:", error.message);
    throw new Error("OCR translation failed");
  }
}

module.exports = extractAndTranslate;
