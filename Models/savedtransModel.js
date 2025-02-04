const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);
savedTransSchema.index({ word: "text" });

const savedtransModel = mongoose.model("savedTrans", savedTransSchema);

module.exports = savedtransModel;
