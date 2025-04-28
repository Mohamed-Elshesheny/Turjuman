const cloudinary = require("./Cloudinary");
const axios = require("axios");
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
    if (!req.file) {
      console.error("❌ No file received in the request.");
      return res
        .status(400)
        .json({ success: false, error: "No audio file uploaded" });
    }

    const fileBuffer = req.file.buffer;

    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      async (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Error:", error);
          return res.status(500).json({ success: false, error });
        }

        const audioUrl = result.secure_url;
        const response = await axios.get(audioUrl, {
          responseType: "arraybuffer",
        });
        const audioBuffer = Buffer.from(response.data, "binary");
        const mimetype = response.headers["content-type"] || "audio/wav";

        const deepgramResult = await transcribeAudioBuffer(
          audioBuffer,
          mimetype,
          "en-US"
        );

        if (!deepgramResult.success) {
          return res
            .status(500)
            .json({ success: false, error: deepgramResult.error });
        }

        res.status(200).json({
          success: true,
          transcript: deepgramResult.transcript,
          translation: deepgramResult.translation,
        });
      }
    );

    uploadStream.end(fileBuffer);
  } catch (error) {
    console.error("❌ Error processing transcription:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { transcribeAudioBuffer, transcribeAudioHandler };
