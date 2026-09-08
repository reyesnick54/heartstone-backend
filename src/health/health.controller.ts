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
