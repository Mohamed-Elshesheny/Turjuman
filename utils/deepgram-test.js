require("dotenv").config(); // Load environment variables

const { createClient } = require("@deepgram/sdk");
const fs = require("fs");

// Deepgram API Key 🔑 from .env
const deepgram = createClient(process.env.VOICE_AI_KEY);

// Function to transcribe audio buffer 🎙️
const transcribeAudioBuffer = async (
  audioBuffer,
  mimetype = "audio/wav",
  language = "auto"
) => {
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        mimetype,
        language,
      }
    );

    if (error) {
      console.error("❌ Deepgram Error:", error);
      return { success: false, error };
    }

    return {
      success: true,
      transcript: result.results.channels[0].alternatives[0].transcript,
    };
  } catch (err) {
    console.error("❌ Unexpected Error:", err);
    return { success: false, error: err };
  }
};

module.exports = { transcribeAudioBuffer };
