import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CivilRegistryAccessClassification,
  CivilRegistryEntryStatus,
  Prisma,
  VitalEventRegistrationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryAuditService } from '../audit/civil-registry-audit.service';
import { CIVIL_REGISTRY_ENTRY_REFERENCE_PREFIX } from '../civil-registry.constants';
import { CivilRegistryBoundaryService } from '../common/civil-registry-boundary.service';
import { buildCivilReference } from '../common/civil-registry-reference.util';

export interface RecordOfficialRegistryEntryInput {
  vitalEventId: string;
  caseId: string;
  jurisdictionId: string;
  institutionId: string;
  civilPersonRecordId?: string;
  governmentDecisionId: string;
  authorityEvaluationRecordId: string;
  registrarOfficeholderId: string;
  registrarIdentityId: string;
  payloadSnapshot: Record<string, unknown>;
  accessClassification?: CivilRegistryAccessClassification;
  actorRoleMarker?: string;
  isAiActor?: boolean;
}

@Injectable()
export class CivilRegistryRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CivilRegistryBoundaryService,
    private readonly audit: CivilRegistryAuditService,
  ) {}

  async recordOfficialEntry(actorIdentityId: string, input: RecordOfficialRegistryEntryInput) {
    this.boundary.assertAiCannotRegisterOrAmend('RECORD_OFFICIAL_ENTRY', Boolean(input.isAiActor));
    this.boundary.assertPlatformAdminCannotAlterOfficialFact({
      actorRoleMarker: input.actorRoleMarker,
      mutatesOfficialRegistryPayload: true,
    });
    this.boundary.assertAuthorityEvaluationRequired(input.authorityEvaluationRecordId);

    const authority = await this.prisma.authorityEvaluationRecord.findUnique({
      where: { id: input.authorityEvaluationRecordId },
    });

    if (!authority) {
      throw new BadRequestException('Authority evaluation record not found');
    }

    this.boundary.assertAuthorityEvaluationPermitsRegistration(authority.outcome);

    const vitalEvent = await this.prisma.vitalEvent.findUnique({
      where: { id: input.vitalEventId },
      include: { registryEntry: true },
    });

    if (!vitalEvent) {
      throw new BadRequestException('Vital event not found');
    }

    if (vitalEvent.registryEntry) {
      throw new BadRequestException('Official registry entry already exists for this vital event');
    }

    const entryReference = buildCivilReference(CIVIL_REGISTRY_ENTRY_REFERENCE_PREFIX);
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.civilRegistryEntry.create({
        data: {
          entryReference,
          vitalEventId: input.vitalEventId,
          civilPersonRecordId: input.civilPersonRecordId,
          jurisdictionId: input.jurisdictionId,
          institutionId: input.institutionId,
          caseId: input.caseId,
          governmentDecisionId: input.governmentDecisionId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          status: CivilRegistryEntryStatus.OFFICIAL,
          currentVersionNumber: 1,
          accessClassification: input.accessClassification,
          registeredAt: now,
        },
      });

      const version = await tx.civilRegistryVersion.create({
        data: {
          civilRegistryEntryId: entry.id,
          versionNumber: 1,
          effectiveFrom: now,
          payloadSnapshot: input.payloadSnapshot as Prisma.InputJsonValue,
          isCurrent: true,
        },
      });

      await tx.vitalEvent.update({
        where: { id: input.vitalEventId },
        data: {
          registrationStatus: VitalEventRegistrationStatus.REGISTERED_OFFICIAL,
          registrationDate: now,
          registrarOfficeholderId: input.registrarOfficeholderId,
          registrarIdentityId: input.registrarIdentityId,
        },
      });

      return { entry, version };
    });

    await this.audit.record({
      vitalEventId: input.vitalEventId,
      civilRegistryEntryId: result.entry.id,
      eventType: 'REGISTRY_ENTRY_RECORDED',
      actorIdentityId,
      metadata: {
        entryReference,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        governmentDecisionId: input.governmentDecisionId,
      },
    });

    return result;
  }

  attemptDeleteRegistryEntry(): void {
    this.boundary.assertHistoricalRegistryDeletionBlocked();
  }
}
