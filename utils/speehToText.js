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

const transcribeAudioHandler = async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const mimetype = req.file.mimetype || "audio/wav";
    const language = "en-US"; // Adjust based on your audio

    const result = await transcribeAudioBuffer(audioBuffer, mimetype, language);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(200).json({ success: true, transcript: result.transcript, translation: result.translation });
  } catch (error) {
    console.error("❌ Error processing transcription:", error);
    res.status(500).json({ success: false, error });
  }
};

module.exports = { transcribeAudioBuffer, transcribeAudioHandler };
