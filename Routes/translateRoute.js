const express = require("express");
const translateController = require("../Controllers/translateController");
const authController = require("../Controllers/authController");
const { transcribeAudioHandler } = require("../utils/speehToText");
const cardController = require("../Controllers/flashCardController");
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

/**
 * @swagger
 * /api/v1/transcribe-audio:
 *   post:
 *     summary: Transcribe and translate audio
 *     description: Upload an audio file to transcribe it into text and translate it into Arabic.
 *     tags:
 *       - Translations
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Audio transcribed and translated successfully
 *       400:
 *         description: Audio processing failed
 */
router.post(
  "/transcribe-audio",
  upload.single("audio"),
  transcribeAudioHandler
);

/**
 * @swagger
 * /api/v1/translate-image:
 *   post:
 *     summary: Translate text from image
 *     description: Upload an image and translate its content using OCR.
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
 * /api/v1/level/{id}:
 *   patch:
 *     summary: Choose difficulty level for flashcards
 *     description: Update the difficulty level for a set of flashcards by ID.
 *     tags:
 *       - Flashcards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The flashcard set ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 description: Desired difficulty level.
 *     responses:
 *       200:
 *         description: Difficulty level updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Flashcard set not found
 */
router.patch("/level/:id", cardController.ChooseDifficulty);

/**
 * @swagger
 * /api/v1/level/test/{id}:
 *   get:
 *     summary: Get hard translation mode for flashcard set
 *     description: Retrieve hard translation mode information for a flashcard set by ID.
 *     tags:
 *       - Flashcards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The flashcard set ID.
 *     responses:
 *       200:
 *         description: Hard translation mode data
 *       404:
 *         description: Flashcard set not found
 */
router.get("/level/test/:id", cardController.HardTransMode);

/**
 * @swagger
 * /api/v1/flashcards/generate:
 *   get:
 *     summary: Generate flashcards
 *     description: Generate a new set of flashcards for the authenticated user.
 *     tags:
 *       - Flashcards
 *     responses:
 *       200:
 *         description: Flashcards generated successfully
 *       400:
 *         description: Generation failed
 */
router.get("/flashcards/generate", cardController.generateFlashcards);

/**
 * @swagger
 * /api/v1/singleTranslation/{id}:
 *   get:
 *     summary: Get a single translation by ID
 *     description: Retrieve a single translation record by its unique ID.
 *     tags:
 *       - Translations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The translation ID.
 *     responses:
 *       200:
 *         description: Translation record retrieved
 *       404:
 *         description: Translation not found
 */
router.get("/singleTranslation/:id", translateController.GetSingleTranslate);

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
 * /api/v1/unfavorite/{id}:
 *   patch:
 *     summary: Unmark translation as favorite
 *     description: Remove a translation from favorites using its ID.
 *     tags:
 *       - Translations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The translation ID.
 *     responses:
 *       200:
 *         description: Translation unmarked as favorite
 *       404:
 *         description: Translation not found
 */
router.patch("/unfavorite/:id", translateController.unMakrFavoriteById);

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
