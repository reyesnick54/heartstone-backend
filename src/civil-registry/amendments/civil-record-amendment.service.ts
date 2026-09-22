import { BadRequestException, Injectable } from '@nestjs/common';
import { CivilRecordAmendmentBasis, CivilRegistryEntryStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryAuditService } from '../audit/civil-registry-audit.service';
import { CivilRegistryBoundaryService } from '../common/civil-registry-boundary.service';

export interface RecordAmendmentInput {
  civilRegistryEntryId: string;
  basis: CivilRecordAmendmentBasis;
  governmentDecisionId: string;
  authorityEvaluationRecordId: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  effectiveDate: Date;
  actorRoleMarker?: string;
  isAiActor?: boolean;
}

@Injectable()
export class CivilRecordAmendmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CivilRegistryBoundaryService,
    private readonly audit: CivilRegistryAuditService,
  ) {}

  async recordAmendment(actorIdentityId: string, input: RecordAmendmentInput) {
    this.boundary.assertAiCannotRegisterOrAmend('AMEND_REGISTRY_ENTRY', Boolean(input.isAiActor));
    this.boundary.assertPlatformAdminCannotAlterOfficialFact({
      actorRoleMarker: input.actorRoleMarker,
      mutatesOfficialRegistryPayload: true,
    });
    this.boundary.assertAuthorityEvaluationRequired(input.authorityEvaluationRecordId);

    const entry = await this.prisma.civilRegistryEntry.findUnique({
      where: { id: input.civilRegistryEntryId },
      include: {
        versions: { where: { isCurrent: true }, take: 1 },
      },
    });

    if (!entry?.versions[0]) {
      throw new BadRequestException('Civil registry entry or current version not found');
    }

    const previousVersion = entry.versions[0];
    const nextVersionNumber = entry.currentVersionNumber + 1;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.civilRegistryVersion.update({
        where: { id: previousVersion.id },
        data: { isCurrent: false, supersededAt: now },
      });

      const newVersion = await tx.civilRegistryVersion.create({
        data: {
          civilRegistryEntryId: entry.id,
          versionNumber: nextVersionNumber,
          effectiveFrom: input.effectiveDate,
          payloadSnapshot: {
            ...(previousVersion.payloadSnapshot as Record<string, unknown>),
            [input.fieldPath]: input.newValue,
          } as Prisma.InputJsonValue,
          isCurrent: true,
        },
      });

      const amendment = await tx.civilRecordAmendment.create({
        data: {
          civilRegistryEntryId: entry.id,
          basis: input.basis,
          governmentDecisionId: input.governmentDecisionId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          previousVersionId: previousVersion.id,
          newVersionId: newVersion.id,
          fieldPath: input.fieldPath,
          previousValue: input.previousValue as Prisma.InputJsonValue,
          newValue: input.newValue as Prisma.InputJsonValue,
          effectiveDate: input.effectiveDate,
        },
      });

      await tx.civilRegistryEntry.update({
        where: { id: entry.id },
        data: {
          status: CivilRegistryEntryStatus.AMENDED,
          currentVersionNumber: nextVersionNumber,
        },
      });

      return { amendment, previousVersion, newVersion };
    });

    await this.audit.record({
      civilRegistryEntryId: input.civilRegistryEntryId,
      eventType: 'AMENDMENT_RECORDED',
      actorIdentityId,
      metadata: {
        fieldPath: input.fieldPath,
        previousVersionId: result.previousVersion.id,
        newVersionId: result.newVersion.id,
      },
    });

    return result;
  }
}
