const savedtransModel = require("../../Models/savedtransModel");

const findExistingTranslation = async (word, srcLang, targetLang, userId) => {
  return await savedtransModel.findOne({
    word,
    srcLang,
    targetLang,
    userId,
  });
};

const saveTranslation = async ({
  word,
  srcLang,
  level,
  targetLang,
  translation,
  userId,
  isFavorite,
  definition,
  synonyms_src,
  synonyms_target,
}) => {
  return await savedtransModel.create({
    word,
    srcLang,
    targetLang,
    translation,
    userId,
    isFavorite,
    level,
    definition,
    synonyms_src,
    synonyms_target,
  });
};

module.exports = { findExistingTranslation, saveTranslation };
