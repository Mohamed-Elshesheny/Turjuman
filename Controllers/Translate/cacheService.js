const redisClient = require("../../utils/redisClient");

/**
 * @class TranslationCache
 * @description Manages tiered caching of translations using Redis (hot, warm, cold).
 */
class TranslationCache {
  constructor(hotCacheKey, warmCacheKey, coldCacheKey) {
    this.cacheKeys = {
      hot: hotCacheKey,
      warm: warmCacheKey,
      cold: coldCacheKey,
    };
    this.expirations = {
      hot: 3600, // 1 hour
      warm: 86400, // 24 hours
      cold: 604800, // 7 days
    };
  }

  /**
   * Retrieve translation from cache tiers.
   * @param {string} word
   * @returns {Promise<object|null>}
   */
  async getCachedTranslation(word) {
    for (const tier of ["hot", "warm", "cold"]) {
      const key = this.cacheKeys[tier];
      const cache = await redisClient.hGet(key, word);
      if (cache) return JSON.parse(cache);
    }
    return null;
  }

  /**
   * Save translation to all cache tiers.
   * @param {string} word
   * @param {object} dictionaryData
   * @param {object} translationObj
   */
  async saveToCache(word, dictionaryData, translationObj) {
    const cacheData = JSON.stringify({
      id: translationObj.id,
      original: word,
      translation: translationObj.translation,
      definition: dictionaryData.definition,
      examples: dictionaryData.examples,
      synonyms_src: dictionaryData.synonyms_src,
      synonyms_target: dictionaryData.synonyms_target,
    });

    const pipeline = redisClient.multi();

    for (const tier of ["hot", "warm", "cold"]) {
      const key = this.cacheKeys[tier];
      pipeline.hSet(key, word, cacheData);
      pipeline.expire(key, this.expirations[tier]);
    }

    await pipeline.exec();
  }
}

module.exports = TranslationCache;
