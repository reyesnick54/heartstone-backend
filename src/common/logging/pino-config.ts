import { type Params } from 'nestjs-pino';

import { PINO_REDACT_PATHS } from './log-redaction';

export function createPinoConfig(): Params {
  return {
    pinoHttp: {
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
              },
            }
          : undefined,
      autoLogging: {
        ignore: (req) => {
          const url = req.url ?? '';
          return url.includes('/health') || url.includes('/ready');
        },
      },
      redact: {
        paths: [...PINO_REDACT_PATHS],
        censor: '[REDACTED]',
      },
      serializers: {
        req: (req: {
          id?: string;
          method?: string;
          url?: string;
          headers?: Record<string, unknown>;
        }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          headers: req.headers
            ? {
                host: req.headers.host,
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type'],
                'content-length': req.headers['content-length'],
              }
            : undefined,
        }),
        res: (res: { statusCode?: number }) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  };
}
