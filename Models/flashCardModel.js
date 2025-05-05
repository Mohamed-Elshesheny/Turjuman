const mongoose = require("mongoose");

const flashcardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  translateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "savedTrans",
    required: function () {
      return this.source === "user";
    },
  },
  word: {
    type: String,
    required: true,
  },
  translation: {
    type: String,
    required: true,
  },
  srcLang: {
    type: String,
  },
  targetLang: {
    type: String,
  },
  source: {
    type: String,
    enum: ["user", "ai"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Flashcard", flashcardSchema);
