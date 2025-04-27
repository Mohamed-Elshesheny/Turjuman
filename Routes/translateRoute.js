const express = require("express");
const translateController = require("../Controllers/translateController");
const authController = require("../Controllers/authController");
const { transcribeAudioBuffer } = require("../utils/speehToText");
const upload = require("../utils/uploadHandler");

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/translate:
 *   post:
 *     summary: Translate text or word
 *     description: Translate text or a word using Gemini AI model.
 *     tags:
 *       - Translations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               Paragraph:
 *                 type: string
 *               sourceLang:
 *                 type: string
 *               targetLang:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful translation
 *       400:
 *         description: Invalid input
 */
router.post(
  "/translate",
  authController.protectUserTranslate,
  translateController.checkTranslationLimit,
  translateController.translateAndSave
);

const fs = require("fs");

router.post("/transcribe-audio", upload.single("audio"), async (req, res) => {
  try {
    const audioBuffer = fs.readFileSync(req.file.path);
    const mimetype = req.file.mimetype || "audio/wav";
    const language = "en-US"; // Adjust based on your audio

    const result = await transcribeAudioBuffer(audioBuffer, mimetype, language);

    fs.unlinkSync(req.file.path); // Remove file after processing

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(200).json({ success: true, transcript: result.transcript });
  } catch (error) {
    console.error("❌ Error processing transcription:", error);
    res.status(500).json({ success: false, error });
  }
});

/**
 * @swagger
 * /api/v1/translate-image:
 *   post:
 *     summary: Translate text from image
 *     description: Upload an image and translate its content.
 *     tags:
 *       - Translations
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image translated successfully
 *       400:
 *         description: Image processing failed
 */

router.use(authController.protect);

/**
 * @swagger
 * /api/v1/translates:
 *   get:
 *     summary: Get user translations
 *     description: Retrieve all translations made by the authenticated user.
 *     tags:
 *       - Translations
 *     responses:
 *       200:
 *         description: List of user translations
 *       401:
 *         description: Unauthorized
 */
router.get("/translates", translateController.getUserTranslation);

/**
 * @swagger
 * /api/v1/favorites/translates:
 *   get:
 *     summary: Get favorite translations
 *     description: Retrieve favorite translations for the authenticated user.
 *     tags:
 *       - Translations
 *     responses:
 *       200:
 *         description: List of favorite translations
 *       401:
 *         description: Unauthorized
 */
router.get("/favorites/translates", translateController.getFavorites);

/**
 * @swagger
 * /api/v1/Home:
 *   get:
 *     summary: Get user translations for home
 *     description: Retrieve summarized translations for the home page view.
 *     tags:
 *       - Translations
 *     responses:
 *       200:
 *         description: Home page translations
 *       401:
 *         description: Unauthorized
 */
router.get("/Home", translateController.userTanslations);

/**
 * @swagger
 * /api/v1/favorite/{id}:
 *   get:
 *     summary: Mark translation as favorite
 *     description: Mark a translation as favorite using its ID.
 *     tags:
 *       - Translations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Translation marked as favorite
 *       404:
 *         description: Translation not found
 */
router.get("/favorite/:id", translateController.markAsFavoriteById);

/**
 * @swagger
 * /api/v1/favorites-order:
 *   get:
 *     summary: Get favorite translations in order
 *     description: Retrieve favorite translations ordered by preference or date.
 *     tags:
 *       - Translations
 *     responses:
 *       200:
 *         description: Ordered favorite translations
 *       401:
 *         description: Unauthorized
 */
router.get("/favorites-order", translateController.getFavoritesInOrder);

/**
 * @swagger
 * /api/v1/translates/{id}:
 *   delete:
 *     summary: Delete a translation by ID
 *     description: Delete a specific translation using its ID.
 *     tags:
 *       - Translations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Translation deleted
 *       404:
 *         description: Translation not found
 */
router.delete("/translates/:id", translateController.deleteTranslationById);

router.post(
  "/translate-image",
  upload.single("image"),
  translateController.ocrTranslateImage
);

/**
 * @swagger
 * /api/v1/translate-file:
 *   post:
 *     summary: Translate text from a file
 *     description: Upload a file (.txt or .docx) and translate its content.
 *     tags:
 *       - Translations
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File translated successfully
 *       400:
 *         description: File processing failed
 */
router.post(
  "/translate-file",
  upload.single("file"),
  translateController.translateFile
);

/**
 * @swagger
 * /api/v1/translations-History-stats:
 *   get:
 *     summary: Get translation history stats
 *     description: Retrieve statistical data about translation history.
 *     tags:
 *       - Translations
 *     responses:
 *       200:
 *         description: Translation stats retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/translations-History-stats",
  translateController.getTranslationHistory
);

/**
 * @swagger
 * /api/v1/translats/search:
 *   get:
 *     summary: Search and filter translations
 *     description: Search and filter user translations based on query parameters.
 *     tags:
 *       - Translations
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filtered translations
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/translats/search",
  translateController.searchAndFilterTranslations
);

router.use(authController.restricTo("admin"));

/**
 * @swagger
 * /api/v1/all-translates:
 *   get:
 *     summary: Get all translations (admin)
 *     description: Retrieve all translations (admin access only).
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: List of all translations
 *       403:
 *         description: Forbidden
 */
router.get("/all-translates", translateController.getalltranslations);

module.exports = router;

// Swagger routes documented: /translate, /translate-image
