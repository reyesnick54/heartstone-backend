import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { CorrelationIdService } from './correlation-id.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly correlationIdService: CorrelationIdService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = this.correlationIdService.resolveIncomingId(
      req.headers['x-correlation-id'] ?? req.headers['x-request-id'],
    );

    res.setHeader('x-correlation-id', correlationId);

    this.correlationIdService.runWithContext({ correlationId }, () => {
      next();
    });
  }
}
