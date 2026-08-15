import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

// Pretty format for development console
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack ?? message}${metaStr}`;
  }),
);

// Structured JSON format for production
const prodFormat = combine(timestamp(), errors({ stack: true }), splat(), json());

const transports: winston.transport[] = [
  // Console transport (primary for cloud & container environments)
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  }),
];

// Optional rotating file logs (safely enabled if log directory is writable)
const logDir = process.env.LOG_DIR ?? 'logs';
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: prodFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: prodFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10,
    }),
  );
} catch {
  // If filesystem is read-only or non-root user lacks mkdir permissions, fallback to console logger
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  transports,
  exitOnError: false,
});
