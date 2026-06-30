const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      console.log("Redis Connected");
      logger.info('✅ Redis connected')
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis error:', err)
      console.log("Error");
    });
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  }
  return redisClient;
};

module.exports = { getRedisClient };
