import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MaritimeComplianceReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async linkComplianceMatter(input: {
    vesselRecordId: string;
    complianceMatterId: string;
    linkageRole?: string;
  }) {
    return this.prisma.maritimeComplianceReference.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        complianceMatterId: input.complianceMatterId,
        linkageRole: input.linkageRole ?? 'SUBJECT',
      },
    });
  }
}
