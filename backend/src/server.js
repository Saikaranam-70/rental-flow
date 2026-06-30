const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { initQueues } = require('./jobs/queueManager');


const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(async () => {
  // Initialize BullMQ job queues after DB is ready
  await initQueues();


  app.listen(PORT, () => {
    logger.info(`🚀 RentFlow API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}).catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});


// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
