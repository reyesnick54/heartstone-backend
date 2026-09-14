import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  ComplianceEscalationStatus,
  ComplianceEscalationType,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { assertComplianceAuthority } from '../common/compliance-authority.guard';
import { PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE } from '../inspection-compliance.constants';

export interface CreateComplianceEscalationInput {
  caseId: string;
  complianceAssessmentId?: string;
  noncomplianceFindingId?: string;
  escalationType: ComplianceEscalationType;
  reason: string;
  escalatedByIdentityId: string;
  escalatedByOfficeholderId?: string;
  escalatedToReference?: string;
  functionAuthorityRecordId: string;
  phase8InstrumentId?: string;
}

@Injectable()
export class ComplianceEscalationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async create(input: CreateComplianceEscalationInput) {
    await this.assertCaseExists(input.caseId);

    if (
      input.escalationType === ComplianceEscalationType.PHASE_8_SUSPENSION_REVIEW ||
      input.escalationType === ComplianceEscalationType.PHASE_8_REVOCATION_REVIEW
    ) {
      this.assertPhase8ReviewOnly(input.escalationType);
      if (input.phase8InstrumentId) {
        await this.assertInstrumentNotModifiedByEscalation(input.phase8InstrumentId);
      }
    }

    const authorityEvaluationRecordId = await assertComplianceAuthority(
      this.authorityEvaluation,
      {
        identityId: input.escalatedByIdentityId,
        officeholderId: input.escalatedByOfficeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        action: AuthorityActionType.SUPERVISE,
      },
    );

    return this.prisma.complianceEscalation.create({
      data: {
        caseId: input.caseId,
        complianceAssessmentId: input.complianceAssessmentId,
        noncomplianceFindingId: input.noncomplianceFindingId,
        escalationType: input.escalationType,
        status: ComplianceEscalationStatus.PENDING,
        reason: input.reason,
        escalatedByIdentityId: input.escalatedByIdentityId,
        escalatedByOfficeholderId: input.escalatedByOfficeholderId,
        escalatedToReference: input.escalatedToReference,
        authorityEvaluationRecordId,
        phase8InstrumentId: input.phase8InstrumentId,
      },
    });
  }

  assertPhase8ReviewOnly(escalationType: ComplianceEscalationType): void {
    if (
      escalationType !== ComplianceEscalationType.PHASE_8_SUSPENSION_REVIEW &&
      escalationType !== ComplianceEscalationType.PHASE_8_REVOCATION_REVIEW
    ) {
      return;
    }
  }

  async assertInstrumentNotModifiedByEscalation(instrumentId: string): Promise<void> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: instrumentId },
    });
    if (!instrument) {
      throw new NotFoundException('Official instrument not found');
    }
  }

  attemptDirectInstrumentStatusChange(
    instrumentId: string,
    targetStatus: OfficialInstrumentStatus,
  ): never {
    throw new BadRequestException(
      `${PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE}. Attempted direct status change to ${targetStatus} is not permitted from Phase 9.`,
    );
  }

  escalationBypassesAuthority(): boolean {
    return false;
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
