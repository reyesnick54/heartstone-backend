import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DigitalAssetsComplianceReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async linkComplianceMatter(input: { regulatedEntityId: string; complianceMatterId: string }) {
    return this.prisma.digitalAssetsComplianceReference.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        complianceMatterId: input.complianceMatterId,
      },
      include: { complianceMatter: true },
    });
  }
}
