const savedTrans = require("../Models/savedtransModel");
const catchAsync = require("express-async-handler");
const { random } = require("../utils/geminiRandom");
const AppError = require("../utils/AppError");
const FlashCard = require("../Models/flashCardModel");
const { generateFlashcardsFromAI } = require("../utils/geminiGenerate");
const APIfeatures = require("../utils/ApiFeaturs");

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
  const { example, examples, definition, synonymsSrc, synonymsTarget } =
    await random(word);

  res.status(200).json({
    status: "success",
    data: {
      word,
      example,
      examples,
      definition,
      synonymsSrc,
      synonymsTarget,
    },
  });
});

exports.generateFlashcards = async (req, res, next) => {
  const userId = req.user.id;

  const translations = await savedTrans.find({ userId });
  const words = translations.map((t) => t.word);

  const existingFlashcards = await FlashCard.find({ userId });
  const existingWords = new Set(existingFlashcards.map((f) => f.word));

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
    const aiGenerated = await generateFlashcardsFromAI(newUserWords);

    for (const item of aiGenerated) {
      if (!existingWords.has(item.word)) {
        const flashcard = await FlashCard.create({
          userId,
          word: item.word,
          translation: item.translation,
          srcLang: item.srcLang,
          targetLang: item.targetLang,
          source: "ai",
          definition: item.definition,
          examples: item.examples,
          synonymsSrc: item.synonymsSrc,
          synonymsTarget: item.synonymsTarget,
        });
        newFlashCards.push(flashcard);
        existingWords.add(item.word);
      }
    }
  }

  // 🧠 Step: Apply filtering, sorting, pagination using APIfeatures
  const features = new APIfeatures(
    FlashCard.find({ userId }).select(
      "word translation srcLang targetLang source definition examples synonymsSrc synonymsTarget translateId"
    ),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const allFlashcards = await features.mongoesquery.populate({
    path: "translateId",
    select: "level",
  });

  const total = await features.getTotalCount();

  res.status(200).json({
    status: "success",
    message: "Flashcards generated successfully ✅",
    added: newFlashCards.length,
    total,
    pagination: features.paginationResult,
    flashcards: allFlashcards.map((card) => ({
      word: card.word,
      translation: card.translation,
      level: card.translateId?.level || null,
      srcLang: card.srcLang,
      targetLang: card.targetLang,
      source: card.source,
      definition: card.definition,
      examples: card.examples,
      synonymsSrc: card.synonymsSrc,
      synonymsTarget: card.synonymsTarget,
    })),
  });
};
