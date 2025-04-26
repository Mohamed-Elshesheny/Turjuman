const redisClient = require("../../utils/redisClient");

const getCachedTranslation = async (
  hotCacheKey,
  warmCacheKey,
  coldCacheKey,
  word
) => {
  const hotCache = await redisClient.hGet(hotCacheKey, word);
  if (hotCache) return JSON.parse(hotCache);

  const warmCache = await redisClient.hGet(warmCacheKey, word);
  if (warmCache) return JSON.parse(warmCache);

  const coldCache = await redisClient.hGet(coldCacheKey, word);
  if (coldCache) return JSON.parse(coldCache);

  return null;
};

const saveToCache = async (
  hotCacheKey,
  warmCacheKey,
  coldCacheKey,
  word,
  dictionaryData,
  translation
) => {
  const cacheData = JSON.stringify({
    original: word,
    translation,
    definition: dictionaryData.definition,
    examples: dictionaryData.examples,
    synonyms_src: dictionaryData.synonyms_src,
    synonyms_target: dictionaryData.synonyms_target,
  });

  await redisClient.hSet(hotCacheKey, word, cacheData);
  await redisClient.expire(hotCacheKey, 3600); // 1 hour

  await redisClient.hSet(warmCacheKey, word, cacheData);
  await redisClient.expire(warmCacheKey, 86400); // 24 hours

  await redisClient.hSet(coldCacheKey, word, cacheData);
  await redisClient.expire(coldCacheKey, 604800); // 7 days
};

module.exports = {
  getCachedTranslation,
  saveToCache,
};
