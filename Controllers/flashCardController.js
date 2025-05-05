const savedTrans = require("../Models/savedtransModel");
const catchAsync = require("express-async-handler");
const { random } = require("../utils/geminiRandom");
const AppError = require("../utils/AppError");
const FlashCard = require("../Models/flashCardModel");
const { generateFlashcardsFromAI } = require("../utils/geminiGenerate");

exports.ChooseDifficulty = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { level } = req.body;

  const translation = await savedTrans.findOne({ userId, _id: id });

  if (!translation) {
    return next(new AppError("Translation Not found!", 404));
  }
  if (level === "easy") {
    await savedTrans.deleteOne({ _id: id });
  } else if (level === "hard") {
    translation.level = "hard";
    await translation.save();
  }

  res.status(200).json({
    status: "success",
    message: level === "easy" ? "Translations Deleted" : "Translatsion Kept",
  });
});

exports.HardTransMode = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;

  const translation = await savedTrans.findOne({ userId, _id: id });

  if (!translation) {
    return next(
      new AppError("There is no (hard) translation with this ID", 404)
    );
  }

  const { word } = translation;
  const example = await random(word);

  res.status(200).json({
    status: "success",
    data: {
      word,
      example,
    },
  });
});

exports.generateFlashcards = async (req, res, next) => {
  const userId = req.user.id;

  //1) Get Translation That User Translate
  const translations = await savedTrans.find({ userId });
  const words = translations.map((t) => t.word);

  //2) To Confirm That Translartion not repeated again
  const existingFlashcards = await FlashCard.find({ userId });
  const existingWords = new Set(existingFlashcards.map((f) => f.word));

  //3) Added The Words in FlashCard
  const newUserWords = [];
  const newFlashCards = [];

  for (const item of translations) {
    if (!existingWords.has(item.word)) {
      const flashcard = await FlashCard.create({
        userId,
        word: item.word,
        translation: item.translation,
        source: "user",
        srcLang: item.srcLang,
        targetLang: item.targetLang,
        translateId: item._id,
      });
      newFlashCards.push(flashcard);
      newUserWords.push(item.word);
      existingWords.add(item.word);
    }
  }

  if (newUserWords.length > 0) {
    //4) After Generate 5 words ... Every word that added in FlashCard,Ai generate 3 Words about this word
    const aiGenerated = await generateFlashcardsFromAI(newUserWords, 3);

    for (const item of aiGenerated) {
      if (!existingWords.has(item.word)) {
        const flashcard = await FlashCard.create({
          userId,
          word: item.word,
          translation: item.translation,
          srcLang: item.srcLang,
          targetLang: item.targetLang,
          source: "ai",
        });
        newFlashCards.push(flashcard);
        existingWords.add(item.word);
      }
    }
  }

  // 5) All Words have the Level that populate from SavedTranslarteSchema
  const allFlashcards = await FlashCard.find({ userId }).populate({
    path: "translateId",
    select: "level",
  });

  res.status(200).json({
    status: "success",
    message: "Flashcards generated successfully ✅",
    added: newFlashCards.length,
    total: allFlashcards.length,
    flashcards: allFlashcards,
  });
};
