const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function random(word) {
  const prompt = `Generate a short and simple sentence in English that uses the word "${word}" 
correctly and naturally.
 Make sure the sentence is meaningful and can help a learner understand how to use the word.
  Avoid using rare or complicated words.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return text;
}

module.exports = { random };
