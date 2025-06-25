const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function random(word) {
  const prompt = `
Given the word: "${word}"

Please return a JSON object with the following keys:
{
  "definition": "Simple definition of the word in English",
  "examples": ["Example sentence 1", "Example sentence 2", "Example sentence 3"],
  "synonymsSrc": ["List of simple synonyms for the word in English"],
  "synonymsTarget": ["List of simple translations or synonyms for the word in Arabic"]
}

Make sure:
- All text is in English except synonymsTarget (which is in Arabic).
- Examples should be natural and help learners understand the word.
- Do NOT include any explanation or text outside the JSON object.
Return only pure JSON.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const rawText = await response.text(); // ✅ لازم await

  const cleanText = rawText
    .trim()
    .replace(/^```json|```$/g, "")
    .trim(); // ✅ تنظيف إن لزم

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("❌ Error parsing Gemini response:", cleanText);
    throw new Error("Failed to parse Gemini response.");
  }
}

module.exports = { random };
