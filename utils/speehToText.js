require("dotenv").config(); // Load environment variables
const { createClient } = require("@deepgram/sdk");
const gemineiTranslate = require("./geminiTranslate");

// Deepgram API Key 🔑 from .env
const deepgram = createClient(process.env.VOICE_AI_KEY);

// Function to transcribe audio buffer 🎙️ and translate to Arabic 🌐
const transcribeAudioBuffer = async (
  audioBuffer,
  mimetype = "audio/wav",
  language = "en-US"
) => {
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        mimetype,
        language,
        smart_format: true,
        model: "nova-2", // Optional, depending on tier
      }
    );

    if (error) {
      console.error("❌ Deepgram Error:", error);
      return { success: false, error };
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // Translate transcript to Arabic
    const translationData = await gemineiTranslate(transcript, "", "en", "ar");

    return {
      success: true,
      transcript,
      translation: translationData.translation || null,
    };
  } catch (err) {
    console.error("❌ Unexpected Error:", err);
    return { success: false, error: err };
  }
};

module.exports = { transcribeAudioBuffer };
