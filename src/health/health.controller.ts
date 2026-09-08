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
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ready')
  async ready() {
    const database = await this.prisma.isHealthy();

    if (!database) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks: {
          database,
        },
      });
    }

    return {
      status: 'ready',
      checks: {
        database,
      },
    };
  }
}
