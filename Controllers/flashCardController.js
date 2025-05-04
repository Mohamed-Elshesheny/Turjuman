const savedTrans = require("../Models/savedtransModel");
const catchAsync = require("express-async-handler");
const AppError = require("../utils/AppError");

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
