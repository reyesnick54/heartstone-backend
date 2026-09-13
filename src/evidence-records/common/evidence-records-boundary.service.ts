import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EvidencePacketVersionStatus,
  EvidenceRecordStatus,
  IdentityType,
  LegalHoldStatus,
  RecordCorrectionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EVIDENCE_RECORDS_EXPLANATION_CODES } from '../evidence-records.constants';
import {
  FORBIDDEN_CLIENT_SETTABLE_EVIDENCE_FIELDS,
  FORBIDDEN_CLIENT_SETTABLE_MASTER_FILE_FIELDS,
  RESTRICTED_EVIDENCE_CONFIDENTIALITY_CLASSIFICATIONS,
} from '../evidence-records-schema.constants';

const ACCEPTED_EVIDENCE_STATUSES: EvidenceRecordStatus[] = [
  EvidenceRecordStatus.ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE,
  EvidenceRecordStatus.ACCEPTED_FOR_LIMITED_RELIANCE,
];

@Injectable()
export class EvidenceRecordsBoundaryService {
  constructor(private readonly prisma: PrismaService) {}

  assertClientPayloadDoesNotSetProtectedFields(
    payload: Record<string, unknown>,
    forbiddenFields: readonly string[],
  ): void {
    for (const field of forbiddenFields) {
      if (field in payload) {
        throw new ForbiddenException({
          message: `Client cannot set protected field: ${field}`,
          code: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_MASS_ASSIGN_STATUS,
        });
      }
    }
  }

  assertClientCannotSetVerified(payload: Record<string, unknown>): void {
    if (
      payload.status === EvidenceRecordStatus.VERIFIED ||
      payload.status === EvidenceRecordStatus.PARTIALLY_VERIFIED ||
      payload.verified === true
    ) {
      throw new ForbiddenException({
        message: 'Client cannot set evidence as verified',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_VERIFIED,
      });
    }
  }

  assertClientCannotSetAccepted(payload: Record<string, unknown>): void {
    if (
      ACCEPTED_EVIDENCE_STATUSES.includes(payload.status as EvidenceRecordStatus) ||
      payload.accepted === true
    ) {
      throw new ForbiddenException({
        message: 'Client cannot set evidence as accepted',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_ACCEPTED,
      });
    }
  }

  assertClientCannotSetSealed(payload: Record<string, unknown>): void {
    if ('frozenAt' in payload || payload.status === EvidencePacketVersionStatus.FROZEN) {
      throw new ForbiddenException({
        message: 'Client cannot freeze packets directly',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_SEALED,
      });
    }
  }

  assertClientCannotSetContentHash(payload: Record<string, unknown>): void {
    if ('contentHash' in payload || 'manifestHash' in payload) {
      throw new ForbiddenException({
        message: 'Client cannot set content hash',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_CONTENT_HASH,
      });
    }
  }

  assertClientCannotEscalateClassification(payload: Record<string, unknown>): void {
    const rawClassification = payload.confidentialityClassification;
    const classification = typeof rawClassification === 'string' ? rawClassification : undefined;
    if (
      classification &&
      RESTRICTED_EVIDENCE_CONFIDENTIALITY_CLASSIFICATIONS.includes(
        classification as (typeof RESTRICTED_EVIDENCE_CONFIDENTIALITY_CLASSIFICATIONS)[number],
      )
    ) {
      throw new ForbiddenException({
        message: 'Client cannot set privileged classification',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_CLASSIFICATION,
      });
    }
  }

  async assertApplicantCanAccessMasterFile(
    masterFileId: string,
    applicantIdentityId: string,
  ): Promise<void> {
    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: masterFileId },
      include: { case: true },
    });
    if (!masterFile?.case) {
      throw new NotFoundException('Master administrative file not found');
    }
    if (masterFile.case.applicantIdentityId !== applicantIdentityId) {
      throw new ForbiddenException({
        message: 'Applicant cannot access unrelated master file',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_MASTER_FILE_ACCESS,
      });
    }
  }

  async assertApplicantCanAccessEvidence(
    evidenceRecordId: string,
    applicantIdentityId: string,
  ): Promise<void> {
    const evidence = await this.prisma.evidenceRecord.findUnique({
      where: { id: evidenceRecordId },
      include: {
        masterAdministrativeFile: { include: { case: true } },
      },
    });
    if (!evidence?.masterAdministrativeFile.case) {
      throw new NotFoundException('Evidence record not found');
    }
    if (evidence.masterAdministrativeFile.case.applicantIdentityId !== applicantIdentityId) {
      throw new ForbiddenException({
        message: 'Applicant cannot access unrelated evidence record',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_EVIDENCE_ACCESS,
      });
    }
    if (
      RESTRICTED_EVIDENCE_CONFIDENTIALITY_CLASSIFICATIONS.includes(
        evidence.confidentialityClassification as (typeof RESTRICTED_EVIDENCE_CONFIDENTIALITY_CLASSIFICATIONS)[number],
      )
    ) {
      throw new ForbiddenException({
        message: 'Restricted evidence cannot appear in applicant view',
        code: 'RESTRICTED_EVIDENCE_APPLICANT_VIEW_FORBIDDEN',
      });
    }
  }

  async assertApplicantCanAccessPacket(
    packetId: string,
    applicantIdentityId: string,
  ): Promise<void> {
    const packet = await this.prisma.evidencePacket.findUnique({
      where: { id: packetId },
      include: {
        masterAdministrativeFile: { include: { case: true } },
      },
    });
    if (!packet?.masterAdministrativeFile.case) {
      throw new NotFoundException('Evidence packet not found');
    }
    if (packet.masterAdministrativeFile.case.applicantIdentityId !== applicantIdentityId) {
      throw new ForbiddenException({
        message: 'Applicant cannot access unrelated evidence packet',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_PACKET_ACCESS,
      });
    }
  }

  async assertApplicantCannotAccessLegalHold(legalHoldId: string): Promise<void> {
    const hold = await this.prisma.legalHold.findUnique({ where: { id: legalHoldId } });
    if (!hold) {
      throw new NotFoundException('Legal hold not found');
    }
    throw new ForbiddenException({
      message: 'Applicant cannot access legal hold records',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_LEGAL_HOLD_ACCESS,
    });
  }

  assertApplicantCannotVerify(isApplicant: boolean): void {
    if (isApplicant) {
      throw new ForbiddenException({
        message: 'Applicant cannot verify evidence',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.APPLICANT_CANNOT_VERIFY,
      });
    }
  }

  assertApplicantCannotAccept(isApplicant: boolean): void {
    if (isApplicant) {
      throw new ForbiddenException({
        message: 'Applicant cannot accept evidence',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.APPLICANT_CANNOT_ACCEPT,
      });
    }
  }

  assertEvidenceVerifiedBeforeAcceptance(status: EvidenceRecordStatus): void {
    if (
      status !== EvidenceRecordStatus.VERIFIED &&
      status !== EvidenceRecordStatus.PARTIALLY_VERIFIED &&
      !ACCEPTED_EVIDENCE_STATUSES.includes(status)
    ) {
      throw new BadRequestException({
        message: 'Evidence must be verified before acceptance',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.VERIFICATION_REQUIRED_BEFORE_ACCEPTANCE,
      });
    }
  }

  assertNotDisputed(status: EvidenceRecordStatus): void {
    if (status === EvidenceRecordStatus.DISPUTED) {
      throw new BadRequestException({
        message: 'Disputed evidence cannot be accepted',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.DISPUTED_EVIDENCE_CANNOT_BE_ACCEPTED,
      });
    }
  }

  assertNotWithdrawn(status: EvidenceRecordStatus): void {
    if (status === EvidenceRecordStatus.WITHDRAWN) {
      throw new BadRequestException({
        message: 'Withdrawn evidence cannot be accepted',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.WITHDRAWN_EVIDENCE_CANNOT_BE_ACCEPTED,
      });
    }
  }

  assertNotSuperseded(status: EvidenceRecordStatus): void {
    if (status === EvidenceRecordStatus.SUPERSEDED) {
      throw new ForbiddenException({
        message: 'Superseded evidence cannot be modified',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.SUPERSEDED_EVIDENCE_CANNOT_BE_MODIFIED,
      });
    }
  }

  assertNotQuarantined(status: EvidenceRecordStatus): void {
    if (status === EvidenceRecordStatus.UNREADABLE) {
      throw new BadRequestException({
        message: 'Quarantined evidence cannot enter packet',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.QUARANTINED_EVIDENCE_CANNOT_ENTER_PACKET,
      });
    }
  }

  assertPacketNotFrozen(status: EvidencePacketVersionStatus): void {
    if (
      status === EvidencePacketVersionStatus.FROZEN ||
      status === EvidencePacketVersionStatus.ARCHIVED
    ) {
      throw new ForbiddenException({
        message: 'Frozen packet cannot be modified',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.SEALED_PACKET_CANNOT_BE_MODIFIED,
      });
    }
  }

  assertPacketFreezeIrreversible(currentStatus: EvidencePacketVersionStatus): void {
    if (currentStatus === EvidencePacketVersionStatus.FROZEN) {
      throw new ForbiddenException({
        message: 'Packet freeze is irreversible',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.PACKET_FREEZE_IS_IRREVERSIBLE,
      });
    }
  }

  async assertLegalHoldDoesNotBlockDisposition(
    _targetType: string,
    targetReference: string,
  ): Promise<void> {
    const activeTargets = await this.prisma.legalHoldTarget.findMany({
      where: {
        targetReference,
        legalHold: { status: LegalHoldStatus.ACTIVE },
      },
    });
    if (activeTargets.length > 0) {
      throw new ForbiddenException({
        message: 'Legal hold blocks disposition execution',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.LEGAL_HOLD_BLOCKS_DISPOSITION,
      });
    }
  }

  assertCorrectionRequiresApproval(status: RecordCorrectionStatus): void {
    if (status !== RecordCorrectionStatus.APPROVED) {
      throw new ForbiddenException({
        message: 'Record correction requires approval before apply',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CORRECTION_REQUIRES_APPROVAL,
      });
    }
  }

  assertAiCannotVerifyIndependently(isAiAssisted: boolean): void {
    if (isAiAssisted) {
      throw new ForbiddenException({
        message: 'AI-assisted actor cannot verify evidence independently',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.AI_CANNOT_VERIFY_INDEPENDENTLY,
      });
    }
  }

  assertServiceIdentityCannotAcceptDecisionSupport(identityType: IdentityType): void {
    if (identityType === IdentityType.SERVICE) {
      throw new ForbiddenException({
        message: 'Service identity cannot accept decision-support evidence',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.SERVICE_IDENTITY_CANNOT_ACCEPT_DECISION_SUPPORT,
      });
    }
  }

  assertCustodyEventNotBackdated(occurredAt: Date): void {
    const now = new Date();
    if (occurredAt.getTime() > now.getTime() + 60_000) {
      throw new BadRequestException({
        message: 'Custody events cannot be backdated into the future',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.CUSTODY_EVENT_CANNOT_BE_BACKDATED,
      });
    }
  }

  assertIntegrityEventsAppendOnly(): never {
    throw new ForbiddenException({
      message: 'Record integrity events are append-only',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.INTEGRITY_EVENTS_APPEND_ONLY,
    });
  }

  assertAccessEventsAppendOnly(): never {
    throw new ForbiddenException({
      message: 'Record access events are append-only',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.ACCESS_EVENTS_APPEND_ONLY,
    });
  }

  assertDocumentVersionImmutable(): never {
    throw new ForbiddenException({
      message: 'Document versions are immutable after registration',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.DOCUMENT_VERSION_IMMUTABLE,
    });
  }

  assertEvidenceCannotBeDeleted(): never {
    throw new ForbiddenException({
      message: 'Evidence records cannot be deleted',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.EVIDENCE_RECORD_CANNOT_BE_DELETED,
    });
  }

  assertMasterFileRequiresCase(caseId: string | null | undefined): void {
    if (!caseId) {
      throw new BadRequestException({
        message: 'Master administrative file requires linked case',
        code: EVIDENCE_RECORDS_EXPLANATION_CODES.MASTER_FILE_REQUIRES_CASE,
      });
    }
  }

  assertPhase7CannotCreateDecision(): void {
    throw new ForbiddenException({
      message: 'Phase 7 cannot create GovernmentDecision',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.PHASE_7_CANNOT_CREATE_DECISION,
    });
  }

  assertPhase7CannotIssueInstrument(): void {
    throw new ForbiddenException({
      message: 'Phase 7 cannot issue license/permit/certificate',
      code: EVIDENCE_RECORDS_EXPLANATION_CODES.PHASE_7_CANNOT_ISSUE_INSTRUMENT,
    });
  }

  assertClientCannotSetCaseReferenceFields(payload: Record<string, unknown>): void {
    this.assertClientPayloadDoesNotSetProtectedFields(
      payload,
      FORBIDDEN_CLIENT_SETTABLE_MASTER_FILE_FIELDS,
    );
  }

  assertClientEvidencePayload(payload: Record<string, unknown>): void {
    this.assertClientPayloadDoesNotSetProtectedFields(
      payload,
      FORBIDDEN_CLIENT_SETTABLE_EVIDENCE_FIELDS,
    );
    this.assertClientCannotSetVerified(payload);
    this.assertClientCannotSetAccepted(payload);
    this.assertClientCannotSetContentHash(payload);
    this.assertClientCannotEscalateClassification(payload);
  }

  async assertPhase7TablesAbsent(): Promise<void> {
    const forbiddenTables = [
      'government_decisions',
      'issued_licenses',
      'issued_permits',
      'issued_certificates',
    ];
    for (const table of forbiddenTables) {
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${table}'`,
      );
      if (Number(result[0]?.count ?? 0) > 0) {
        throw new ForbiddenException({
          message: `Phase 7 boundary violation: ${table} exists`,
          code: EVIDENCE_RECORDS_EXPLANATION_CODES.PHASE_7_CANNOT_CREATE_DECISION,
        });
      }
    }
  }
}
