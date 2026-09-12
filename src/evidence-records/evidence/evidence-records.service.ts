import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EvidenceCustodyEventType,
  EvidencePurposeType,
  EvidenceStatus,
  EvidenceVerificationStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { EVIDENCE_REFERENCE_PREFIX } from '../evidence-records.constants';
import { MasterFilesService } from '../master-files/master-files.service';

@Injectable()
export class EvidenceRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
    private readonly masterFiles: MasterFilesService,
  ) {}

  async register(input: {
    masterAdministrativeFileId: string;
    actorIdentityId: string;
    isOfficial: boolean;
    title: string;
    description?: string;
    documentRecordId?: string;
    requirementCode?: string;
    requirementLabel?: string;
    clientPayload?: Record<string, unknown>;
  }) {
    if (input.clientPayload) {
      this.boundary.assertClientEvidencePayload(input.clientPayload);
    }

    await this.masterFiles.assertAccess(
      input.masterAdministrativeFileId,
      input.actorIdentityId,
      input.isOfficial,
    );

    const evidence = await this.prisma.evidenceRecord.create({
      data: {
        evidenceReference: generateEvidenceReferenceNumber(EVIDENCE_REFERENCE_PREFIX),
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        documentRecordId: input.documentRecordId,
        title: input.title,
        description: input.description,
        status: EvidenceStatus.RECEIVED,
        verifications: {
          create: { status: EvidenceVerificationStatus.PENDING },
        },
        custodyEvents: {
          create: {
            eventType: EvidenceCustodyEventType.RECEIVED,
            actorIdentityId: input.actorIdentityId,
            notes: 'Initial receipt',
          },
        },
        requirementLinks: input.requirementCode
          ? {
              create: {
                requirementCode: input.requirementCode,
                requirementLabel: input.requirementLabel,
                satisfied: false,
              },
            }
          : undefined,
      },
      include: {
        verifications: true,
        requirementLinks: true,
        custodyEvents: true,
      },
    });

    return evidence;
  }

  async verify(input: {
    evidenceRecordId: string;
    actorIdentityId: string;
    isApplicant: boolean;
    isAiAssisted?: boolean;
    officeholderId?: string;
    findings?: string;
  }) {
    this.boundary.assertApplicantCannotVerify(input.isApplicant);
    this.boundary.assertAiCannotVerifyIndependently(input.isAiAssisted ?? false);
    await this.boundary.assertOfficialIdentity(input.actorIdentityId);

    const evidence = await this.getEvidence(input.evidenceRecordId);
    this.boundary.assertNotSuperseded(evidence.status);

    const verification = evidence.verifications[0];
    if (!verification) {
      throw new NotFoundException('Evidence verification record not found');
    }

    await this.prisma.evidenceVerification.update({
      where: { id: verification.id },
      data: {
        status: EvidenceVerificationStatus.VERIFIED,
        verifierIdentityId: input.actorIdentityId,
        verifierOfficeholderId: input.officeholderId,
        findings: input.findings,
        verifiedAt: new Date(),
      },
    });

    return this.prisma.evidenceRecord.update({
      where: { id: input.evidenceRecordId },
      data: { status: EvidenceStatus.VERIFIED },
      include: { verifications: true, requirementLinks: true },
    });
  }

  async acceptForPurpose(input: {
    evidenceRecordId: string;
    actorIdentityId: string;
    isApplicant: boolean;
    purposeType: EvidencePurposeType;
    officeholderId?: string;
    notes?: string;
  }) {
    this.boundary.assertApplicantCannotAccept(input.isApplicant);

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.actorIdentityId },
    });
    if (!identity) {
      throw new NotFoundException('Identity not found');
    }
    this.boundary.assertServiceIdentityCannotAcceptDecisionSupport(identity.type);

    const evidence = await this.getEvidence(input.evidenceRecordId);
    this.boundary.assertNotSuperseded(evidence.status);
    this.boundary.assertNotDisputed(evidence.status);
    this.boundary.assertNotWithdrawn(evidence.status);
    this.boundary.assertEvidenceVerifiedBeforeAcceptance(evidence.status);

    await this.prisma.evidencePurposeAcceptance.create({
      data: {
        evidenceRecordId: input.evidenceRecordId,
        purposeType: input.purposeType,
        acceptedByIdentityId: input.actorIdentityId,
        acceptedByOfficeholderId: input.officeholderId,
        acceptedAt: new Date(),
        notes: input.notes,
      },
    });

    if (evidence.requirementLinks.length > 0) {
      await this.prisma.evidenceRequirementLink.updateMany({
        where: { evidenceRecordId: input.evidenceRecordId },
        data: { satisfied: true },
      });
    }

    return this.prisma.evidenceRecord.update({
      where: { id: input.evidenceRecordId },
      data: { status: EvidenceStatus.ACCEPTED },
      include: { purposeAcceptances: true, requirementLinks: true },
    });
  }

  async dispute(input: {
    evidenceRecordId: string;
    actorIdentityId: string;
    isOfficial: boolean;
    reason: string;
  }) {
    const evidence = await this.getEvidence(input.evidenceRecordId);
    this.boundary.assertNotSuperseded(evidence.status);

    if (!input.isOfficial) {
      await this.boundary.assertApplicantCanAccessEvidence(
        input.evidenceRecordId,
        input.actorIdentityId,
      );
    }

    await this.prisma.evidenceVerification.updateMany({
      where: { evidenceRecordId: input.evidenceRecordId },
      data: { status: EvidenceVerificationStatus.DISPUTED },
    });

    return this.prisma.evidenceRecord.update({
      where: { id: input.evidenceRecordId },
      data: { status: EvidenceStatus.DISPUTED },
    });
  }

  async findById(evidenceRecordId: string, actorIdentityId: string, isOfficial: boolean) {
    if (!isOfficial) {
      await this.boundary.assertApplicantCanAccessEvidence(evidenceRecordId, actorIdentityId);
    }
    return this.getEvidence(evidenceRecordId);
  }

  deleteEvidence(): never {
    return this.boundary.assertEvidenceCannotBeDeleted();
  }

  private async getEvidence(evidenceRecordId: string) {
    const evidence = await this.prisma.evidenceRecord.findUnique({
      where: { id: evidenceRecordId },
      include: {
        verifications: true,
        requirementLinks: true,
        purposeAcceptances: true,
      },
    });
    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }
    return evidence;
  }
}
