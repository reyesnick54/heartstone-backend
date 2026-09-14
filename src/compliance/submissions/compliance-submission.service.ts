import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceSubmissionStatus,
  ContinuingObligationStatus,
  ObligationEvidenceLinkRole,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceBoundaryService } from '../common/compliance-boundary.service';
import { hashComplianceSubmissionPayload } from '../common/compliance-hash.util';
import {
  COMPLIANCE_SUBMISSION_NUMBER_PREFIX,
  PHASE_9B_BOUNDARY_DISCLAIMER,
} from '../compliance.constants';
import { ReceiveComplianceSubmissionDto } from '../dto/receive-compliance-submission.dto';
import { RequestSubmissionCorrectionDto } from '../dto/request-submission-correction.dto';

@Injectable()
export class ComplianceSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async receiveSubmission(submitterIdentityId: string, dto: ReceiveComplianceSubmissionDto) {
    this.boundary.rejectForbiddenSubmissionFields(dto as unknown as Record<string, unknown>);

    const obligation = await this.prisma.continuingObligation.findUnique({
      where: { id: dto.continuingObligationId },
    });
    if (!obligation) {
      throw new NotFoundException(`ContinuingObligation ${dto.continuingObligationId} not found`);
    }

    const submittedAt = new Date();
    const effectiveDeadline =
      obligation.effectiveExtendedDueDate ?? obligation.dueDate;
    const isLate = effectiveDeadline != null && submittedAt > effectiveDeadline;

    const count = await this.prisma.complianceSubmission.count();
    const submissionNumber = `${COMPLIANCE_SUBMISSION_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const payload = {
      answersData: dto.answersData,
      documentReferences: dto.documentReferences ?? [],
      evidenceReferences: dto.evidenceReferences ?? [],
    };
    const payloadHash = hashComplianceSubmissionPayload(payload);

    const submission = await this.prisma.complianceSubmission.create({
      data: {
        submissionNumber,
        complianceMatterId: dto.complianceMatterId,
        continuingObligationId: dto.continuingObligationId,
        reportingPeriodStart: new Date(dto.reportingPeriodStart),
        reportingPeriodEnd: new Date(dto.reportingPeriodEnd),
        submittedByIdentityId: submitterIdentityId,
        representativeAuthorityId: dto.representativeAuthorityId,
        submittedAt,
        status: ComplianceSubmissionStatus.RECEIVED,
        declarationReference: dto.declarationReference,
        versions: {
          create: {
            version: 1,
            answersData: dto.answersData as Prisma.InputJsonValue,
            documentReferences: (dto.documentReferences ?? []) as Prisma.InputJsonValue,
            evidenceReferences: (dto.evidenceReferences ?? []) as Prisma.InputJsonValue,
            payloadHash,
            submittedAt,
          },
        },
      },
      include: { versions: true },
    });

    const version = submission.versions[0];
    if (!version) {
      throw new BadRequestException('Submission version was not created');
    }
    await this.prisma.complianceSubmission.update({
      where: { id: submission.id },
      data: {
        currentVersionId: version.id,
        status: ComplianceSubmissionStatus.COMPLETE_FOR_REVIEW,
      },
    });

    await this.prisma.continuingObligation.update({
      where: { id: obligation.id },
      data: {
        status: isLate
          ? ContinuingObligationStatus.OVERDUE
          : ContinuingObligationStatus.SUBMITTED,
      },
    });

    return {
      submission: await this.prisma.complianceSubmission.findUnique({
        where: { id: submission.id },
        include: { versions: true, continuingObligation: true },
      }),
      receiptDisclaimer: PHASE_9B_BOUNDARY_DISCLAIMER,
      isLate,
      sanctionAutoCreated: false,
    };
  }

  async requestCorrection(
    reviewerIdentityId: string,
    dto: RequestSubmissionCorrectionDto,
  ) {
    const submission = await this.prisma.complianceSubmission.findUnique({
      where: { id: dto.submissionId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!submission) {
      throw new NotFoundException(`ComplianceSubmission ${dto.submissionId} not found`);
    }

    const latestVersion = submission.versions[0];
    if (!latestVersion) {
      throw new BadRequestException('Submission has no versions to correct');
    }

    const nextVersionNumber = latestVersion.version + 1;
    const payload = {
      answersData: dto.answersData,
      documentReferences: dto.documentReferences ?? [],
      evidenceReferences: dto.evidenceReferences ?? [],
      correctionReason: dto.correctionReason,
    };
    const payloadHash = hashComplianceSubmissionPayload(payload);
    const submittedAt = new Date();

    const newVersion = await this.prisma.complianceSubmissionVersion.create({
      data: {
        submissionId: submission.id,
        version: nextVersionNumber,
        answersData: dto.answersData as Prisma.InputJsonValue,
        documentReferences: (dto.documentReferences ?? []) as Prisma.InputJsonValue,
        evidenceReferences: (dto.evidenceReferences ?? []) as Prisma.InputJsonValue,
        payloadHash,
        submittedAt,
        supersedesVersionId: latestVersion.id,
      },
    });

    await this.prisma.complianceSubmission.update({
      where: { id: submission.id },
      data: {
        currentVersionId: newVersion.id,
        status: ComplianceSubmissionStatus.CORRECTION_REQUESTED,
      },
    });

    const preservedOriginal = await this.prisma.complianceSubmissionVersion.findUnique({
      where: { id: latestVersion.id },
    });

    return {
      submissionId: submission.id,
      newVersion,
      preservedOriginalVersion: preservedOriginal,
      priorVersionRetained: true,
    };
  }

  async linkHolderEvidence(
    obligationId: string,
    evidenceRecordId: string,
    linkedByIdentityId: string,
  ) {
    return this.prisma.obligationEvidenceLink.create({
      data: {
        continuingObligationId: obligationId,
        evidenceRecordId,
        linkRole: ObligationEvidenceLinkRole.HOLDER_SUBMITTED,
        isHolderSubmitted: true,
        linkedByIdentityId,
      },
    });
  }

  async linkVerifiedEvidence(
    obligationId: string,
    evidenceRecordId: string,
    linkedByIdentityId: string,
    evidenceVerificationId: string,
  ) {
    return this.prisma.obligationEvidenceLink.create({
      data: {
        continuingObligationId: obligationId,
        evidenceRecordId,
        linkRole: ObligationEvidenceLinkRole.INDEPENDENTLY_VERIFIED,
        isHolderSubmitted: false,
        linkedByIdentityId,
        evidenceVerificationId,
      },
    });
  }
}
