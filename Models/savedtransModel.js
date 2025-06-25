const mongoose = require("mongoose");
const { type } = require("os");

const savedTransSchema = new mongoose.Schema(
  {
    word: {
      type: String,
    },
    translation: {
      type: String,
      required: true,
    },
    paragraph: {
      type: String,
    },
    srcLang: {
      type: String,
    },
    targetLang: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
      select: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    definition: String,
    synonyms_src: [String],
    synonyms_target: [String],
    level: {
      type: String,
      default: "Medium",
    },
    examples: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);
savedTransSchema.index({ word: "text" });
savedTransSchema.index({ srcLang: 1, targetLang: 1 });
savedTransSchema.index({ userId: 1 });

const savedtransModel = mongoose.model("savedTrans", savedTransSchema);

module.exports = savedtransModel;
