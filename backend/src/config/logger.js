const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'white' };
winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    `${timestamp} [${level.toUpperCase()}]: ${stack || message}`
  )
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  format
);

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join('logs', 'rentflow-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format,
});

const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join('logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format,
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    fileRotateTransport,
    errorFileTransport,
  ],
});

module.exports = logger;
