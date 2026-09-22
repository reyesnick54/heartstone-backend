import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyRegistryAuditEventType,
  PropertyRegistryCorrectionStatus,
  PropertyTransactionHistoryEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryAuditService } from '../audit/property-registry-audit.service';
import { PropertyRegistryCadastreBoundaryService } from '../common/property-registry-cadastre-boundary.service';
import { buildPropertyReference } from '../common/property-registry-reference.util';
import { PROPERTY_CORRECTION_REFERENCE_PREFIX } from '../property-registry.constants';

@Injectable()
export class PropertyRegistryCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryCadastreBoundaryService,
    private readonly audit: PropertyRegistryAuditService,
  ) {}

  async submitRequest(
    applicantIdentityId: string,
    input: {
      propertyRegistryEntryId: string;
      requestedChanges: Record<string, unknown>;
      clientStatus?: PropertyRegistryCorrectionStatus;
    },
  ) {
    if (input.clientStatus) {
      this.boundary.assertCorrectionRequestIsNotApproval(input.clientStatus);
    }

    const correctionReference = buildPropertyReference(PROPERTY_CORRECTION_REFERENCE_PREFIX);

    const request = await this.prisma.propertyRegistryCorrection.create({
      data: {
        correctionReference,
        propertyRegistryEntryId: input.propertyRegistryEntryId,
        applicantIdentityId,
        status: PropertyRegistryCorrectionStatus.SUBMITTED,
        requestedChanges: input.requestedChanges as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
    });

    await this.audit.record({
      propertyRegistryEntryId: input.propertyRegistryEntryId,
      eventType: PropertyRegistryAuditEventType.CORRECTION_SUBMITTED,
      actorIdentityId: applicantIdentityId,
      metadata: { correctionReference },
    });

    return request;
  }

  async recordApprovedCorrection(input: {
    correctionId: string;
    previousTitleVersionId: string;
    newTitleVersionId: string;
    titleRecordId: string;
    governmentDecisionId: string;
    authorityEvaluationRecordId: string;
    actorIdentityId: string;
  }) {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.titleVersion.update({
        where: { id: input.previousTitleVersionId },
        data: { isCurrent: false, supersededAt: now },
      });

      await tx.titleVersion.update({
        where: { id: input.newTitleVersionId },
        data: { isCurrent: true },
      });

      const correction = await tx.propertyRegistryCorrection.update({
        where: { id: input.correctionId },
        data: {
          status: PropertyRegistryCorrectionStatus.APPROVED_FOR_CORRECTION,
          previousTitleVersionId: input.previousTitleVersionId,
          newTitleVersionId: input.newTitleVersionId,
          governmentDecisionId: input.governmentDecisionId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          decidedAt: now,
        },
      });

      await tx.propertyTransactionHistory.create({
        data: {
          titleRecordId: input.titleRecordId,
          eventType: PropertyTransactionHistoryEventType.CORRECTION,
          effectiveDate: now,
          eventSummary: {
            previousTitleVersionId: input.previousTitleVersionId,
            newTitleVersionId: input.newTitleVersionId,
          },
        },
      });

      return correction;
    });

    await this.audit.record({
      eventType: PropertyRegistryAuditEventType.TITLE_VERSION_RECORDED,
      actorIdentityId: input.actorIdentityId,
      metadata: {
        correctionId: input.correctionId,
        preservedPriorVersion: input.previousTitleVersionId,
      },
    });

    return result;
  }
}
