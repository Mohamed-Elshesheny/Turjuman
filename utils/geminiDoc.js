const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API with your key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to split text into manageable chunks
function splitText(text, chunkSize = 400, overlap = 20) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let chunks = [];
  let currentChunk = "";

  for (let i = 0; i < sentences.length; i++) {
    if ((currentChunk + sentences[i]).length <= chunkSize) {
      currentChunk += sentences[i] + " ";
    } else {
      chunks.push(currentChunk.trim());
      i -= overlap > 0 ? overlap : 0;
      currentChunk = "";
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// Function to translate a paragraph using Gemini, with source and target language
async function translateParagraph(
  paragraph,
  srcLang = "English",
  targetLang = "Arabic"
) {
  const prompt = `
You are an expert translator.

Translate the following paragraph from ${srcLang} to ${targetLang}.

Strict Instructions:
- The translation must be in formal, natural ${targetLang}, suitable for publication.
- Do NOT include transliteration or Romanized text.
- Do NOT include pronunciation or phonetic symbols.
- Do NOT explain anything.
- Return ONLY the translated paragraph, nothing else.

Translate:
${paragraph}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();
  return text.trim();
}

// Export the functions for use in other files
module.exports = {
  translateParagraph,
  splitText,
};
