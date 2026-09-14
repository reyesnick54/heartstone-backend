import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IntegrationIdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async findExistingRequest(integrationVersionId: string, idempotencyKey: string) {
    return this.prisma.integrationRequest.findUnique({
      where: {
        integrationVersionId_idempotencyKey: {
          integrationVersionId,
          idempotencyKey,
        },
      },
      include: {
        exchanges: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: {
            responseRecords: true,
            validationResults: true,
          },
        },
      },
    });
  }
}
