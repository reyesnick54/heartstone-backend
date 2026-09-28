import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CarbonManagementComplianceReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async linkComplianceMatter(input: { carbonProjectId: string; complianceMatterId: string }) {
    return this.prisma.carbonComplianceReference.create({
      data: {
        id: randomUUID(),
        carbonProjectId: input.carbonProjectId,
        complianceMatterId: input.complianceMatterId,
      },
      include: { complianceMatter: true },
    });
  }
}
