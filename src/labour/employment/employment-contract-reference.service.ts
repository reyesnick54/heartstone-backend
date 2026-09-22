import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { LabourBoundaryService } from '../common/labour-boundary.service';

@Injectable()
export class EmploymentContractReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: LabourBoundaryService,
  ) {}

  async linkContractReference(input: {
    employmentRelationshipId: string;
    contractReferenceToken: string;
    documentRecordId?: string;
  }) {
    const reference = await this.prisma.employmentContractReference.create({
      data: {
        id: randomUUID(),
        employmentRelationshipId: input.employmentRelationshipId,
        contractReferenceToken: input.contractReferenceToken,
        documentRecordId: input.documentRecordId,
        doesNotAuthorizeWork: true,
        doesNotIssueWorkPermit: true,
      },
    });

    this.boundary.assertEmploymentContractDoesNotCreateWorkPermit({
      doesNotIssueWorkPermit: reference.doesNotIssueWorkPermit,
      workPermitsCreated: 0,
    });

    return { reference, workPermitsCreated: 0 };
  }
}
