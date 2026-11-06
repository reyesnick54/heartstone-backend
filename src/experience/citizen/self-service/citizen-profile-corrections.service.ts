import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type RecordCorrection } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { RecordCorrectionService } from '../../../evidence/correction/record-correction.service';
import { SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import {
  CITIZEN_PROFILE_CORRECTABLE_FIELDS,
  CITIZEN_PROFILE_CORRECTION_DISCLAIMER,
  CITIZEN_PROFILE_CORRECTION_TARGET,
  CITIZEN_SELF_SERVICE_ERROR_CODES,
  type CitizenProfileCorrectableField,
} from './citizen-self-service.constants';
import {
  type CitizenProfileCorrectionListDto,
  type CitizenProfileCorrectionRequestDto,
  type CreateCitizenProfileCorrectionDto,
} from './dto/citizen-self-service.dto';

/** Stored per field so a reviewer sees what the record said when the request was made. */
type ProposedChanges = Partial<
  Record<CitizenProfileCorrectableField, { current: string | null; requested: string }>
>;

/**
 * Citizen requests to correct their own profile (Person) record. A request is recorded as a
 * `RecordCorrection` in REQUESTED state for an authorized official to review; the Person row is
 * never written here. Approval and implementation stay with the existing governed correction
 * workflow, which keeps the original.
 */
@Injectable()
export class CitizenProfileCorrectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly corrections: RecordCorrectionService,
    private readonly audit: SecurityAuditService,
  ) {}

  async list(identityId: string): Promise<CitizenProfileCorrectionListDto> {
    const corrections = await this.prisma.recordCorrection.findMany({
      where: { requestedBy: identityId, targetRecordType: CITIZEN_PROFILE_CORRECTION_TARGET },
      orderBy: { requestedAt: 'desc' },
    });
    return { items: corrections.map((correction) => this.toDto(correction)) };
  }

  async request(
    session: SessionContextDto,
    dto: CreateCitizenProfileCorrectionDto,
  ): Promise<CitizenProfileCorrectionRequestDto> {
    const identityId = session.identityId;
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { person: true },
    });
    const person = identity?.person;
    if (!person) {
      throw new ConflictException({
        message: 'No person record is linked to this account',
        code: CITIZEN_SELF_SERVICE_ERROR_CODES.PERSON_RECORD_NOT_LINKED,
      });
    }

    const proposedChanges: ProposedChanges = {};
    for (const field of CITIZEN_PROFILE_CORRECTABLE_FIELDS) {
      const requested = dto[field]?.trim();
      if (requested === undefined || requested === '') {
        continue;
      }
      const current = person[field];
      if (requested !== current) {
        proposedChanges[field] = { current, requested };
      }
    }
    if (Object.keys(proposedChanges).length === 0) {
      throw new BadRequestException({
        message: 'Request at least one change that differs from your current record',
        code: CITIZEN_SELF_SERVICE_ERROR_CODES.NO_CHANGE_REQUESTED,
      });
    }

    const supportingDocumentIds = dto.supportingDocumentIds ?? [];
    await this.assertOwnDocuments(identityId, supportingDocumentIds);

    const correction = await this.corrections.requestCorrection({
      targetRecordType: CITIZEN_PROFILE_CORRECTION_TARGET,
      targetRecordId: person.id,
      requestedBy: identityId,
      errorOrDisputeDescription: dto.reason,
      supportingEvidenceIds: supportingDocumentIds,
      proposedChanges,
      idempotencyKey: dto.idempotencyKey,
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId: session.sessionId,
      actorIdentityId: identityId,
      metadata: {
        action: 'CITIZEN_PROFILE_CORRECTION_REQUESTED',
        recordCorrectionId: correction.id,
        targetRecordType: CITIZEN_PROFILE_CORRECTION_TARGET,
        targetRecordId: person.id,
        fields: Object.keys(proposedChanges),
      },
    });

    return this.toDto(correction);
  }

  /** Supporting documents must be ones this citizen uploaded; anything else is "not found". */
  private async assertOwnDocuments(identityId: string, documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) {
      return;
    }
    const owned = await this.prisma.documentRecord.count({
      where: {
        id: { in: documentIds },
        versions: { some: { receivedFromIdentityId: identityId } },
      },
    });
    if (owned !== documentIds.length) {
      throw new NotFoundException('Supporting document not found');
    }
  }

  private toDto(correction: RecordCorrection): CitizenProfileCorrectionRequestDto {
    const proposed =
      typeof correction.proposedChanges === 'object' &&
      correction.proposedChanges !== null &&
      !Array.isArray(correction.proposedChanges)
        ? (correction.proposedChanges as ProposedChanges)
        : {};
    const requestedChanges: Partial<Record<CitizenProfileCorrectableField, string>> = {};
    for (const field of CITIZEN_PROFILE_CORRECTABLE_FIELDS) {
      const requested = proposed[field]?.requested;
      if (typeof requested === 'string') {
        requestedChanges[field] = requested;
      }
    }
    const supportingDocumentIds = Array.isArray(correction.supportingEvidenceIds)
      ? correction.supportingEvidenceIds.filter((id): id is string => typeof id === 'string')
      : [];

    return {
      id: correction.id,
      status: correction.status,
      requestedChanges,
      reason: correction.errorOrDisputeDescription,
      supportingDocumentIds,
      requestedAt: correction.requestedAt.toISOString(),
      disclaimer: CITIZEN_PROFILE_CORRECTION_DISCLAIMER,
    };
  }
}
