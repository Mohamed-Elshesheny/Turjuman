const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateFlashcardsFromAI(wordsArray) {
  const prompt = `
Generate 5 English words that are related in meaning or topic to the following words:
"${wordsArray.join(", ")}".

For each word, provide an Arabic translation in the following JSON format:
[
  { "word": "apple", "translation": "تفاحة" },
  ...
]
Keep it simple and useful for beginner learners.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean and parse JSON
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    const jsonString = text.slice(jsonStart, jsonEnd + 1);

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini generation error:", error.message);
    throw new Error("Failed to generate flashcards from Gemini");
  }
}

module.exports = { generateFlashcardsFromAI };
