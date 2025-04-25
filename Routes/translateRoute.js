const express = require("express");
const translateController = require("../Controllers/translateController");
const authController = require("../Controllers/authController");
const upload = require("../utils/uploadHandler");

const router = express.Router({ mergeParams: true });

router.post(
  "/translate",
  authController.protectUserTranslate,
  translateController.checkTranslationLimit,
  translateController.translateAndSave
);

router.use(authController.protect);
router.get("/translates", translateController.getUserTranslation);
router.get("/favorites/translates", translateController.getFavorites);
router.get("/Home", translateController.userTanslations);
router.get("/favorite/:id", translateController.markAsFavoriteById);
router.get("/favorites-order", translateController.getFavoritesInOrder);
router.delete("/translates/:id", translateController.deleteTranslationById);
router.post(
  "/translate-image",
  upload.single("image"),
  translateController.ocrTranslateImage
);

router.post(
  "/translate-file",
  upload.single("file"),
  translateController.translateFile
);
router.get(
  "/translations-History-stats",
  translateController.getTranslationHistory
);
router.get(
  "/translats/search",
  translateController.searchAndFilterTranslations
);

router.use(authController.restricTo("admin"));
router.get("/all-translates", translateController.getalltranslations);

module.exports = router;
