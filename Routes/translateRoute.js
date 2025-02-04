const express = require("express");
const translateController = require("../Controllers/translateController");
const authController = require("../Controllers/authController");

const router = express.Router({ mergeParams: true });

router.post(
  "/translate",
  authController.protectUserTranslate,
  translateController.checkTranslationLimit,
  translateController.translateAndSave
);

router.get(
  "/translates",
  authController.protect,
  translateController.getUserTranslation
);

router.get(
  "/favorites/translates",
  authController.protect,
  translateController.getFavorites
);

router.get(
  "/favorites-order",
  authController.protect,
  translateController.getFavoritesInOrder
);

router.get(
  "/all-translates",
  authController.protect,
  authController.restricTo("admin"),
  translateController.getalltranslations
);

router.delete(
  "/translates/:id",
  authController.protect,
  translateController.deleteTranslationById
);

router.get(
  "/translations-History-stats",
  authController.protect,
  translateController.getTranslationHistory
);

router.get(
  "/translats/search",
  authController.protect,
  translateController.searchAndFilterTranslations
);

module.exports = router;
