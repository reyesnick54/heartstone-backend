import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MaritimeApplicationReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async linkApplicationReference(input: {
    vesselRecordId: string;
    applicationId?: string;
    caseId?: string;
    serviceCode?: string;
    licenceTypeCode?: string;
  }) {
    return this.prisma.maritimeApplicationReference.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        applicationId: input.applicationId,
        caseId: input.caseId,
        serviceCode: input.serviceCode,
        licenceTypeCode: input.licenceTypeCode,
      },
    });
  }
}
