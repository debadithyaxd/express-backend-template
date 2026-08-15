import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import morgan, { type StreamOptions } from 'morgan';

// Pipe Morgan HTTP logs into Winston
const stream: StreamOptions = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging in test mode
const skip = () => env.NODE_ENV === 'test';

const morganMiddleware = morgan(
  env.NODE_ENV === 'production'
    ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
    : ':method :url :status :response-time ms - :res[content-length]',
  { stream, skip },
);

export default morganMiddleware;
