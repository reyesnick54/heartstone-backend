import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  InspectionFindingSeverity,
  InspectionFindingStatus,
  InspectionSessionStatus,
  ProfessionalSignatureSource,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../boundary/inspection-compliance-boundary.service';
import { INSPECTOR_OUTSIDE_AUTHORITY_MESSAGE } from '../inspection-compliance.constants';

export interface CreateInspectionFindingInput {
  inspectionSessionId: string;
  findingNumber: string;
  factsReliedUpon: string;
  severity: InspectionFindingSeverity;
  responsiblePartyReference?: string;
  recommendedDisposition?: string;
  inspectorIdentityId: string;
  inspectorOfficeholderId: string;
  limitations?: string;
  evidenceRecordIds?: string[];
  requirementLinks: {
    governingSourceId?: string;
    requirementReference: string;
    requirementSummary?: string;
  }[];
}

export interface ConfirmInspectionFindingInput {
  findingId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  functionAuthorityRecordId: string;
  signatureSource?: ProfessionalSignatureSource;
}

@Injectable()
export class InspectionFindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly boundary: InspectionComplianceBoundaryService,
  ) {}

  async createDraftFinding(input: CreateInspectionFindingInput) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: input.inspectionSessionId },
      include: { inspectionRecord: { include: { inspectors: true } } },
    });

    if (!session) {
      throw new NotFoundException('Inspection session not found');
    }

    if (session.status !== InspectionSessionStatus.IN_PROGRESS) {
      throw new ForbiddenException('Findings may only be drafted during an in-progress session');
    }

    const isAssignedInspector = session.inspectionRecord.inspectors.some(
      (inspector) =>
        inspector.identityId === input.inspectorIdentityId &&
        inspector.officeholderId === input.inspectorOfficeholderId,
    );
    if (!isAssignedInspector) {
      throw new ForbiddenException(
        'Government inspection finding must remain attributable to an assigned government inspector',
      );
    }

    this.boundary.assertFindingReferencesRequirement(input.requirementLinks.length);
    this.boundary.assertSeverityDoesNotImplySanction(input.severity);

    const evidenceUnresolved = this.boundary.assertFindingWithoutEvidenceCanBeUnresolved(
      input.evidenceRecordIds?.length ?? 0,
    );

    return this.prisma.inspectionFinding.create({
      data: {
        inspectionSessionId: input.inspectionSessionId,
        findingNumber: input.findingNumber,
        factsReliedUpon: input.factsReliedUpon,
        severity: input.severity,
        responsiblePartyReference: input.responsiblePartyReference,
        recommendedDisposition: input.recommendedDisposition,
        inspectorIdentityId: input.inspectorIdentityId,
        inspectorOfficeholderId: input.inspectorOfficeholderId,
        limitations: input.limitations,
        evidenceUnresolved,
        status: InspectionFindingStatus.DRAFT,
        requirementLinks: {
          create: input.requirementLinks.map((link) => ({
            governingSourceId: link.governingSourceId,
            requirementReference: link.requirementReference,
            requirementSummary: link.requirementSummary,
          })),
        },
        evidenceLinks: input.evidenceRecordIds?.length
          ? {
              create: input.evidenceRecordIds.map((evidenceRecordId) => ({
                evidenceRecordId,
              })),
            }
          : undefined,
      },
      include: { requirementLinks: true, evidenceLinks: true },
    });
  }

  async confirmFinding(input: ConfirmInspectionFindingInput) {
    const finding = await this.prisma.inspectionFinding.findUnique({
      where: { id: input.findingId },
      include: { inspectionSession: { include: { inspectionRecord: true } } },
    });

    if (!finding) {
      throw new NotFoundException('Inspection finding not found');
    }

    if (finding.status === InspectionFindingStatus.CONFIRMED) {
      throw new BadRequestException('Finding is already confirmed');
    }

    this.boundary.assertAiCannotConfirmViolation(
      input.signatureSource ?? ProfessionalSignatureSource.AI_ASSISTANCE,
    );

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.reviewerIdentityId,
      officeholderId: input.reviewerOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.INSPECT,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(INSPECTOR_OUTSIDE_AUTHORITY_MESSAGE);
    }

    return this.prisma.inspectionFinding.update({
      where: { id: input.findingId },
      data: {
        status: InspectionFindingStatus.CONFIRMED,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        confirmationAuthorityEvaluationRecordId: evaluation.evaluationId,
      },
      include: { requirementLinks: true, evidenceLinks: true },
    });
  }

  async markEvidenceUnresolved(findingId: string) {
    return this.prisma.inspectionFinding.update({
      where: { id: findingId },
      data: { evidenceUnresolved: true },
    });
  }
}
