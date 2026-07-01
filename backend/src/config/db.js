const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

    // Drop old global unique index on rentalNumber to support multi-tenancy
    try {
      await conn.connection.db.collection('rentals').dropIndex('rentalNumber_1');
      logger.info('Dropped legacy global unique index: rentalNumber_1');
    } catch (indexErr) {
      // Index does not exist or has already been dropped
    }

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (err) {
    logger.error('MongoDB connection failed:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
