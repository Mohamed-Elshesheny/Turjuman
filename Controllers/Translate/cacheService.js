const redisClient = require("../../utils/redisClient");

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

  async getCachedTranslation(word) {
    for (const tier of ["hot", "warm", "cold"]) {
      const key = this.cacheKeys[tier];
      const cache = await redisClient.hGet(key, word);
      if (cache) return JSON.parse(cache);
    }
    return null;
  }

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
