const winston = require('winston');

const formatFn = info => `${info.level} ${info.label} ${info.timestamp} ${info.message}`;

export const serviceLogger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.label({ label: 'service' }),
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.printf(formatFn),
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'debug.log', level: 'debug' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
  format: winston.format.combine(
    winston.format.label({ label: 'service' }),
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.printf(formatFn),
  ),
});

export const clientLogger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.label({ label: 'client' }),
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.printf(formatFn),
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'debug.log', level: 'debug' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
  format: winston.format.combine(
    winston.format.label({ label: 'client' }),
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.printf(formatFn),
  ),
});
