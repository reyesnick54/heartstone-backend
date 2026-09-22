import { BadRequestException, Injectable } from '@nestjs/common';
import { CivilRecordCorrectionRequestStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryAuditService } from '../audit/civil-registry-audit.service';
import { CIVIL_CORRECTION_REQUEST_REFERENCE_PREFIX } from '../civil-registry.constants';
import { CivilRegistryBoundaryService } from '../common/civil-registry-boundary.service';
import { buildCivilReference } from '../common/civil-registry-reference.util';

export interface SubmitCorrectionRequestInput {
  subjectCivilPersonRecordId: string;
  civilRegistryEntryId?: string;
  caseId?: string;
  requestedChanges: Record<string, unknown>;
  clientStatus?: CivilRecordCorrectionRequestStatus;
}

@Injectable()
export class CivilRecordCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CivilRegistryBoundaryService,
    private readonly audit: CivilRegistryAuditService,
  ) {}

  async submitRequest(applicantIdentityId: string, input: SubmitCorrectionRequestInput) {
    if (input.clientStatus) {
      this.boundary.assertCorrectionRequestIsNotApproval(input.clientStatus);
    }

    const requestReference = buildCivilReference(CIVIL_CORRECTION_REQUEST_REFERENCE_PREFIX);

    const request = await this.prisma.civilRecordCorrectionRequest.create({
      data: {
        requestReference,
        applicantIdentityId,
        subjectCivilPersonRecordId: input.subjectCivilPersonRecordId,
        civilRegistryEntryId: input.civilRegistryEntryId,
        caseId: input.caseId,
        status: CivilRecordCorrectionRequestStatus.SUBMITTED,
        requestedChanges: input.requestedChanges as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
    });

    await this.audit.record({
      civilRegistryEntryId: input.civilRegistryEntryId,
      eventType: 'CORRECTION_REQUEST_SUBMITTED',
      actorIdentityId: applicantIdentityId,
      metadata: { requestReference },
    });

    return request;
  }

  async markApprovedForAmendmentViaReview(
    reviewerIdentityId: string,
    requestId: string,
    caseId: string,
  ) {
    const existing = await this.prisma.civilRecordCorrectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      throw new BadRequestException('Correction request not found');
    }

    const updated = await this.prisma.civilRecordCorrectionRequest.update({
      where: { id: requestId },
      data: {
        status: CivilRecordCorrectionRequestStatus.APPROVED_FOR_AMENDMENT,
        caseId,
        decidedAt: new Date(),
      },
    });

    await this.audit.record({
      civilRegistryEntryId: existing.civilRegistryEntryId ?? undefined,
      eventType: 'CORRECTION_REQUEST_DECIDED',
      actorIdentityId: reviewerIdentityId,
      metadata: { requestId, status: updated.status },
    });

    return updated;
  }
}
