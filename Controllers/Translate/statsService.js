const mongoose = require("mongoose");
const savedtransModel = require("../../Models/savedtransModel");
const catchAsync = require("express-async-handler");

const getTranslationStats = async (userId) => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailyStats = await savedtransModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfDay },
      },
    },
    { $group: { _id: "$targetLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { targetLang: "$_id", count: "$count" },
        },
        dailyTotal: { $sum: "$count" },
      },
    },
  ]);

  const weeklyStats = await savedtransModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfWeek },
      },
    },
    { $group: { _id: "$targetLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { targetLang: "$_id", count: "$count" },
        },
        weeklyTotal: { $sum: "$count" },
      },
    },
  ]);

  const monthlyStats = await savedtransModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfMonth },
      },
    },
    { $group: { _id: "$targetLang", count: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        translations: {
          $push: { targetLang: "$_id", count: "$count" },
        },
        monthlyTotal: { $sum: "$count" },
      },
    },
  ]);

  const mostSelectedLanguages = await savedtransModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: { srcLang: "$srcLang", targetLang: "$targetLang" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 2 },
  ]);

  const calculatePercentages = (translations, total) => {
    return translations
      .map((t) => ({
        language: t.targetLang || t.language,
        count: t.count,
        percentage:
          total > 0 ? ((t.count / total) * 100).toFixed(2) + "%" : "0%",
      }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    dailyStats: {
      total: dailyStats[0]?.dailyTotal || 0,
      translations: calculatePercentages(
        dailyStats[0]?.translations || [],
        dailyStats[0]?.dailyTotal || 0
      ),
    },
    weeklyStats: {
      total: weeklyStats[0]?.weeklyTotal || 0,
      translations: calculatePercentages(
        weeklyStats[0]?.translations || [],
        weeklyStats[0]?.weeklyTotal || 0
      ),
    },
    monthlyStats: {
      total: monthlyStats[0]?.monthlyTotal || 0,
      translations: calculatePercentages(
        monthlyStats[0]?.translations || [],
        monthlyStats[0]?.monthlyTotal || 0
      ),
    },
    topLanguages: mostSelectedLanguages.map((l) => ({
      from: l._id.srcLang,
      to: l._id.targetLang,
      count: l.count,
    })),
  };
};

const getTranslationHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const stats = await getTranslationStats(userId);

  res.status(200).json({
    status: "success",
    data: stats,
  });
});

module.exports = {
  getTranslationHistory,
};
