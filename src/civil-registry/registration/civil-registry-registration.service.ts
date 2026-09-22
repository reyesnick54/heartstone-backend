import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CivilRegistryEventType,
  CivilRegistryRecordStatus,
  CivilRegistrySubmissionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryAccessService } from '../access/civil-registry-access.service';
import {
  CIVIL_REGISTRY_DISCLAIMERS,
  CIVIL_REGISTRY_SERVICE_PACK_ID,
} from '../civil-registry.constants';

export interface CreateEventSubmissionInput {
  caseId: string;
  applicationId: string;
  eventType: CivilRegistryEventType;
  institutionId: string;
  subjectIdentityId?: string;
  summaryLabel?: string;
}

export interface RegisterOfficialEventInput {
  vitalRecordId: string;
  officialIdentityId: string;
  summaryLabel: string;
  recordStatePayload: Record<string, unknown>;
}

export interface ApproveCorrectionInput {
  vitalRecordId: string;
  officialIdentityId: string;
  amendmentReason: string;
  correctedStatePayload: Record<string, unknown>;
  summaryLabel: string;
}

@Injectable()
export class CivilRegistryRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CivilRegistryAccessService,
  ) {}

  async createEventSubmission(input: CreateEventSubmissionInput) {
    const existing = await this.prisma.civilRegistryEventSubmission.findUnique({
      where: { caseId: input.caseId },
      include: { vitalRecord: true },
    });
    if (existing?.vitalRecord) {
      return {
        submission: existing,
        vitalRecord: existing.vitalRecord,
        disclaimer: CIVIL_REGISTRY_DISCLAIMERS.submissionNotOfficial,
      };
    }

    const recordNumber = `CIV-TPL-${input.caseId.slice(0, 8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const vitalRecord = await tx.civilRegistryVitalRecord.create({
        data: {
          recordNumber,
          eventType: input.eventType,
          status: CivilRegistryRecordStatus.SUBMISSION_PENDING,
          institutionId: input.institutionId,
          subjectIdentityId: input.subjectIdentityId,
          registrationCaseId: input.caseId,
          servicePackReference: CIVIL_REGISTRY_SERVICE_PACK_ID,
        },
      });

      if (input.subjectIdentityId) {
        await tx.civilRegistryRecordEntitlement.create({
          data: {
            vitalRecordId: vitalRecord.id,
            identityId: input.subjectIdentityId,
            entitlementKind: 'SUBJECT',
          },
        });
      }

      const submission = await tx.civilRegistryEventSubmission.create({
        data: {
          caseId: input.caseId,
          applicationId: input.applicationId,
          vitalRecordId: vitalRecord.id,
          eventType: input.eventType,
          status: CivilRegistrySubmissionStatus.SUBMITTED,
        },
      });

      return {
        submission,
        vitalRecord,
        disclaimer: CIVIL_REGISTRY_DISCLAIMERS.submissionNotOfficial,
      };
    });
  }

  async registerOfficialEvent(input: RegisterOfficialEventInput) {
    const record = await this.prisma.civilRegistryVitalRecord.findUnique({
      where: { id: input.vitalRecordId },
      include: { currentVersion: true, submissions: true },
    });

    if (!record) {
      throw new NotFoundException(`Vital record ${input.vitalRecordId} not found`);
    }

    if (this.access.isOfficialRecord(record)) {
      throw new BadRequestException('Vital record is already official');
    }

    const recordStateHash = this.hashState(input.recordStatePayload);

    return this.prisma.$transaction(async (tx) => {
      const version = await tx.civilRegistryVitalRecordVersion.create({
        data: {
          vitalRecordId: record.id,
          versionNumber: 1,
          recordStateHash,
          summaryLabel: input.summaryLabel,
          isOriginal: true,
          registeredByOfficialIdentityId: input.officialIdentityId,
        },
      });

      const updatedRecord = await tx.civilRegistryVitalRecord.update({
        where: { id: record.id },
        data: {
          status: CivilRegistryRecordStatus.OFFICIAL,
          currentVersionId: version.id,
        },
      });

      await tx.civilRegistryEventSubmission.updateMany({
        where: { vitalRecordId: record.id },
        data: { status: CivilRegistrySubmissionStatus.REGISTERED },
      });

      return { record: updatedRecord, version };
    });
  }

  async approveCorrection(input: ApproveCorrectionInput) {
    const record = await this.prisma.civilRegistryVitalRecord.findUnique({
      where: { id: input.vitalRecordId },
      include: { currentVersion: true },
    });

    if (!record?.currentVersion) {
      throw new NotFoundException(`Official vital record ${input.vitalRecordId} not found`);
    }

    const recordStateHash = this.hashState(input.correctedStatePayload);
    const nextVersionNumber = record.currentVersion.versionNumber + 1;

    return this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.civilRegistryVitalRecordVersion.create({
        data: {
          vitalRecordId: record.id,
          versionNumber: nextVersionNumber,
          recordStateHash,
          summaryLabel: input.summaryLabel,
          amendmentReason: input.amendmentReason,
          isOriginal: false,
          supersedesVersionId: record.currentVersionId ?? undefined,
          registeredByOfficialIdentityId: input.officialIdentityId,
        },
      });

      const updatedRecord = await tx.civilRegistryVitalRecord.update({
        where: { id: record.id },
        data: {
          status: CivilRegistryRecordStatus.CORRECTED,
          currentVersionId: newVersion.id,
        },
      });

      return {
        record: updatedRecord,
        previousVersionId: record.currentVersionId,
        newVersion,
      };
    });
  }

  assertCitizenCannotMutateOfficialRecord(): void {
    throw new ForbiddenException(
      'Citizens cannot register or amend official vital records. Use governed GovernmentService applications.',
    );
  }

  private hashState(payload: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
