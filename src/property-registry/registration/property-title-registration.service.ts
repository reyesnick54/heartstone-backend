import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyRegistryAccessClassification,
  PropertyRegistryAuditEventType,
  PropertyTransactionHistoryEventType,
  PropertyTransferApplicationStatus,
  TitleRecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryAuditService } from '../audit/property-registry-audit.service';
import { PropertyRegistryBoundaryService } from '../common/property-registry-boundary.service';
import { buildPropertyReference } from '../common/property-registry-reference.util';
import { PROPERTY_REGISTRY_ENTRY_REFERENCE_PREFIX } from '../property-registry.constants';

export interface RecordOfficialTitleRegistrationInput {
  propertyTransferId: string;
  caseId: string;
  jurisdictionId: string;
  institutionId: string;
  governmentDecisionId: string;
  authorityEvaluationRecordId: string;
  registrarOfficeholderId: string;
  registrarIdentityId: string;
  titlePayloadSnapshot: Record<string, unknown>;
  accessClassification?: PropertyRegistryAccessClassification;
  actorRoleMarker?: string;
  isAiActor?: boolean;
}

@Injectable()
export class PropertyTitleRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryBoundaryService,
    private readonly audit: PropertyRegistryAuditService,
  ) {}

  async recordOfficialTitleRegistration(
    actorIdentityId: string,
    input: RecordOfficialTitleRegistrationInput,
  ) {
    this.boundary.assertAiCannotApproveTitleTransfer('RECORD_TITLE_TRANSFER', Boolean(input.isAiActor));
    this.boundary.assertPlatformAdminCannotMutateLegalOwnership({
      actorRoleMarker: input.actorRoleMarker,
      mutatesLegalOwnership: true,
    });
    this.boundary.assertAuthorityEvaluationRequired(input.authorityEvaluationRecordId);

    const authority = await this.prisma.authorityEvaluationRecord.findUnique({
      where: { id: input.authorityEvaluationRecordId },
    });

    if (!authority) {
      throw new BadRequestException('Authority evaluation record not found');
    }

    this.boundary.assertAuthorityEvaluationPermitsRegistration(authority.outcome);

    const transfer = await this.prisma.propertyTransfer.findUnique({
      where: { id: input.propertyTransferId },
      include: { registryEntry: true, titleRecord: true },
    });

    if (!transfer) {
      throw new BadRequestException('Property transfer not found');
    }

    if (!transfer.titleRecordId || !transfer.titleRecord) {
      throw new BadRequestException('Title record must exist before official registration');
    }

    if (transfer.registryEntry) {
      throw new BadRequestException('Official registry entry already recorded for this transfer');
    }

    const titleRecordId = transfer.titleRecordId;
    const titleRecord = transfer.titleRecord;
    const entryReference = buildPropertyReference(PROPERTY_REGISTRY_ENTRY_REFERENCE_PREFIX);
    const now = new Date();
    const nextVersionNumber = titleRecord.currentVersionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const priorVersion = await tx.titleVersion.findFirst({
        where: { titleRecordId, isCurrent: true },
      });

      if (priorVersion) {
        await tx.titleVersion.update({
          where: { id: priorVersion.id },
          data: { isCurrent: false, supersededAt: now },
        });
      }

      const version = await tx.titleVersion.create({
        data: {
          titleRecordId,
          versionNumber: nextVersionNumber,
          effectiveFrom: now,
          registrationDate: now,
          payloadSnapshot: input.titlePayloadSnapshot as Prisma.InputJsonValue,
          isCurrent: true,
          governingDecisionId: input.governmentDecisionId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          registrarOfficeholderId: input.registrarOfficeholderId,
          registrarIdentityId: input.registrarIdentityId,
          transferBasisSummary: {
            propertyTransferId: transfer.id,
            transferReference: transfer.transferReference,
          },
        },
      });

      const entry = await tx.propertyRegistryEntry.create({
        data: {
          entryReference,
          propertyRecordId: transfer.propertyRecordId,
          titleRecordId,
          propertyTransferId: transfer.id,
          jurisdictionId: input.jurisdictionId,
          institutionId: input.institutionId,
          caseId: input.caseId,
          governmentDecisionId: input.governmentDecisionId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          accessClassification: input.accessClassification,
          registeredAt: now,
        },
      });

      await tx.titleRecord.update({
        where: { id: titleRecordId },
        data: {
          currentVersionNumber: nextVersionNumber,
          status: TitleRecordStatus.ACTIVE,
          registeredAt: titleRecord.registeredAt ?? now,
        },
      });

      await tx.propertyTransfer.update({
        where: { id: transfer.id },
        data: { applicationStatus: PropertyTransferApplicationStatus.REGISTERED_OFFICIAL },
      });

      await tx.propertyTransactionHistory.create({
        data: {
          titleRecordId,
          propertyTransferId: transfer.id,
          eventType: PropertyTransactionHistoryEventType.TITLE_REGISTRATION,
          effectiveDate: now,
          eventSummary: {
            priorTitleVersionId: priorVersion?.id ?? null,
            newTitleVersionId: version.id,
            entryReference,
          },
        },
      });

      return { entry, version, priorVersion };
    });

    await this.audit.record({
      propertyRegistryEntryId: result.entry.id,
      propertyTransferId: transfer.id,
      eventType: PropertyRegistryAuditEventType.TITLE_VERSION_RECORDED,
      actorIdentityId,
      metadata: {
        priorVersionId: result.priorVersion?.id,
        newVersionId: result.version.id,
      },
    });

    return result;
  }
}
