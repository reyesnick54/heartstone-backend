import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  NoncomplianceFindingStatus,
  NoncomplianceMateriality,
  NoncomplianceRepetition,
  NoncomplianceSeverity,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  assertComplianceAuthority,
  assertNotServiceIdentity,
} from '../common/compliance-authority.guard';
import { buildComplianceNumber } from '../common/compliance-number.util';
import {
  AI_ALERT_NOT_VIOLATION_MESSAGE,
  FINDING_REQUIRES_AUTHORIZED_HUMAN_MESSAGE,
  NONCOMPLIANCE_FINDING_NUMBER_PREFIX,
} from '../inspection-compliance.constants';

export interface ProposeNoncomplianceFindingInput {
  caseId: string;
  complianceAssessmentId?: string;
  requirementSource: string;
  facts: string;
  evidencePacketId?: string;
  responsibleSubjectType: string;
  responsibleSubjectReference: string;
  scope: string;
  severity: NoncomplianceSeverity;
  repetition?: NoncomplianceRepetition;
  materiality: NoncomplianceMateriality;
  reasons?: string;
  reviewRights?: string;
  isAiProposed?: boolean;
}

export interface ConfirmNoncomplianceFindingInput {
  findingId: string;
  confirmedByIdentityId: string;
  confirmedByOfficeholderId: string;
  functionAuthorityRecordId: string;
  isAiActor?: boolean;
  isTechnicalAdminOnly?: boolean;
  hasCaseAssignmentOnly?: boolean;
}

@Injectable()
export class NoncomplianceFindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async propose(input: ProposeNoncomplianceFindingInput) {
    await this.assertCaseExists(input.caseId);
    const sequence = await this.prisma.noncomplianceFinding.count();
    const findingNumber = buildComplianceNumber(NONCOMPLIANCE_FINDING_NUMBER_PREFIX, sequence + 1);

    if (input.isAiProposed) {
      return this.prisma.noncomplianceFinding.create({
        data: {
          findingNumber,
          caseId: input.caseId,
          complianceAssessmentId: input.complianceAssessmentId,
          requirementSource: input.requirementSource,
          facts: input.facts,
          evidencePacketId: input.evidencePacketId,
          responsibleSubjectType: input.responsibleSubjectType,
          responsibleSubjectReference: input.responsibleSubjectReference,
          scope: input.scope,
          severity: input.severity,
          repetition: input.repetition ?? NoncomplianceRepetition.FIRST_OCCURRENCE,
          materiality: input.materiality,
          status: NoncomplianceFindingStatus.PROPOSED,
          reasons: input.reasons,
          reviewRights: input.reviewRights,
          isAiProposed: true,
        },
      });
    }

    return this.prisma.noncomplianceFinding.create({
      data: {
        findingNumber,
        caseId: input.caseId,
        complianceAssessmentId: input.complianceAssessmentId,
        requirementSource: input.requirementSource,
        facts: input.facts,
        evidencePacketId: input.evidencePacketId,
        responsibleSubjectType: input.responsibleSubjectType,
        responsibleSubjectReference: input.responsibleSubjectReference,
        scope: input.scope,
        severity: input.severity,
        repetition: input.repetition ?? NoncomplianceRepetition.FIRST_OCCURRENCE,
        materiality: input.materiality,
        status: NoncomplianceFindingStatus.DRAFT,
        reasons: input.reasons,
        reviewRights: input.reviewRights,
        isAiProposed: false,
      },
    });
  }

  async confirm(input: ConfirmNoncomplianceFindingInput) {
    if (input.isTechnicalAdminOnly || input.hasCaseAssignmentOnly) {
      await assertComplianceAuthority(this.authorityEvaluation, {
        identityId: input.confirmedByIdentityId,
        officeholderId: input.confirmedByOfficeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        action: AuthorityActionType.ENFORCE,
        isTechnicalAdminOnly: input.isTechnicalAdminOnly,
        hasCaseAssignmentOnly: input.hasCaseAssignmentOnly,
      });
    }

    const finding = await this.prisma.noncomplianceFinding.findUnique({
      where: { id: input.findingId },
    });
    if (!finding) {
      throw new NotFoundException('Noncompliance finding not found');
    }

    if (finding.status === NoncomplianceFindingStatus.CONFIRMED) {
      throw new BadRequestException('Finding is already confirmed');
    }

    if (input.isAiActor || finding.isAiProposed) {
      const identity = await this.prisma.identity.findUnique({
        where: { id: input.confirmedByIdentityId },
      });
      if (identity) {
        assertNotServiceIdentity(identity.type);
      }
      if (input.isAiActor || (finding.isAiProposed && !input.confirmedByOfficeholderId)) {
        throw new ForbiddenException(
          finding.isAiProposed
            ? `${AI_ALERT_NOT_VIOLATION_MESSAGE}. ${FINDING_REQUIRES_AUTHORIZED_HUMAN_MESSAGE}`
            : FINDING_REQUIRES_AUTHORIZED_HUMAN_MESSAGE,
        );
      }
    }

    const authorityEvaluationRecordId = await assertComplianceAuthority(this.authorityEvaluation, {
      identityId: input.confirmedByIdentityId,
      officeholderId: input.confirmedByOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.ENFORCE,
      isAiActor: input.isAiActor,
      isTechnicalAdminOnly: input.isTechnicalAdminOnly,
      hasCaseAssignmentOnly: input.hasCaseAssignmentOnly,
    });

    return this.prisma.noncomplianceFinding.update({
      where: { id: input.findingId },
      data: {
        status: NoncomplianceFindingStatus.CONFIRMED,
        confirmedByIdentityId: input.confirmedByIdentityId,
        confirmedByOfficeholderId: input.confirmedByOfficeholderId,
        confirmedAt: new Date(),
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        authorityEvaluationRecordId,
      },
    });
  }

  async rejectAiAutoConfirmation(findingId: string): Promise<void> {
    const finding = await this.prisma.noncomplianceFinding.findUnique({
      where: { id: findingId },
    });
    if (!finding) {
      throw new NotFoundException('Noncompliance finding not found');
    }
    if (finding.isAiProposed) {
      throw new ForbiddenException(AI_ALERT_NOT_VIOLATION_MESSAGE);
    }
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
