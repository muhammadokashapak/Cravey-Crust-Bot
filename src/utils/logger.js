/**
 * ╔══════════════════════════════════════════╗
 * ║   Logger — src/utils/logger.js           ║
 * ║   Pino structured logger with            ║
 * ║   development pretty-print support.      ║
 * ╚══════════════════════════════════════════╝
 */

import pino from 'pino';

const isDev = (process.env.NODE_ENV || 'production') !== 'production';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    // Pretty-print in development for readability
    ...(isDev ? {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname',
            },
        },
    } : {}),
    // Redact sensitive fields from all log output
    redact: {
        paths: [
            'password',
            'password_hash',
            'token',
            'secret',
            'N8N_BOT_SECRET',
            'DASHBOARD_PASS',
            'DATABASE_URL',
            'REDIS_URL',
            '*.password',
            '*.token',
            '*.secret',
        ],
        censor: '[REDACTED]',
    },
});

// Child loggers for named subsystems
export const dbLogger       = logger.child({ module: 'db' });
export const apiLogger      = logger.child({ module: 'api' });
export const botLogger      = logger.child({ module: 'bot' });
export const n8nLogger      = logger.child({ module: 'n8n' });
export const flagLogger     = logger.child({ module: 'flags' });

export default logger;
