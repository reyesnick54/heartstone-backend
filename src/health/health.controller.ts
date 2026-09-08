import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('ready')
  async ready(@Res() response: Response): Promise<void> {
    const result = await this.healthService.checkReadiness();
    const statusCode =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    response.status(statusCode).json(result);
  }
}
