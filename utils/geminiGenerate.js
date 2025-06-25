const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateFlashcardsFromAI(wordsArray) {
  const prompt = `
You are a smart flashcard generator.

Given the following English words: [${wordsArray.join(", ")}]

Generate a related English word for each of them, and for each word return a complete flashcard object using this **exact** JSON format:

[
  {
    "word": "string",
    "translation": "Arabic word",
    "definition": "Simple English definition of the word",
    "examples": ["Example 1", "Example 2", "Example 3"],
    "synonymsSrc": ["Synonym1", "Synonym2", "Synonym3"],
    "synonymsTarget": ["مرادف1", "مرادف2", "مرادف3"]
  }
]

⚠️ Rules:
- Return ONLY valid JSON — no text, no explanation, no markdown.
- The "examples" array must contain **3 short, useful English sentences** using the word naturally.
- "definition" must be 1-2 lines, simple English.
- "synonymsSrc" and "synonymsTarget" must contain real synonyms in English and Arabic respectively.
- Make sure ALL fields are filled. Do not leave anything empty.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text();

    // 🔍 استخلاص الـ JSON فقط حتى لو Gemini زود كلام حوالين
    const match = text.match(/\[.*\]/s); // match any array inside []
    if (!match) throw new Error("JSON array not found in Gemini response.");

    const jsonString = match[0];
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("❌ Gemini generation error:", error.message);
    throw new Error("Failed to generate flashcards from Gemini");
  }
}

module.exports = { generateFlashcardsFromAI };
