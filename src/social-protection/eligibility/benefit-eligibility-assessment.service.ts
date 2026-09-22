import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BenefitEligibilityAssessmentStatus,
  BenefitEligibilityOutcome,
  Prisma,
  SocialProtectionActorPersona,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';
import { BENEFIT_ELIGIBILITY_ASSESSMENT_PREFIX } from '../social-protection.constants';
import { ConfigurableBenefitEligibilityEngine } from './configurable-benefit-eligibility.engine';

@Injectable()
export class BenefitEligibilityAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
    private readonly engine: ConfigurableBenefitEligibilityEngine,
  ) {}

  async recordPreliminaryAssessment(input: {
    benefitApplicationProfileId: string;
    benefitProgramId: string;
    benefitProgramVersionId: string;
    eligibilityRuleVersionReference: string;
    inputFacts: Record<string, unknown>;
    actorPersona?: SocialProtectionActorPersona;
    createAwardIfPermitted?: boolean;
  }) {
    if (input.actorPersona === SocialProtectionActorPersona.AI_ASSISTANCE) {
      this.boundary.assertAiCannotTerminateBenefit(input.actorPersona, 'FINALIZE_ELIGIBILITY');
    }

    const programVersion = await this.prisma.benefitProgramVersion.findUnique({
      where: { id: input.benefitProgramVersionId },
    });
    if (!programVersion) {
      throw new NotFoundException('Benefit program version not found');
    }

    const calculation = this.engine.assess({
      benefitProgramVersionId: input.benefitProgramVersionId,
      eligibilityRuleVersionReference: input.eligibilityRuleVersionReference,
      inputFacts: input.inputFacts,
      methodologyReference: 'CONFIGURABLE_SERVICE_PACK',
    });

    const awardsCreated = input.createAwardIfPermitted ? 1 : 0;
    this.boundary.assertEligibilityDoesNotAutoCreateAward({
      doesNotCreateBenefitAward: true,
      workflowPermitsAutoAward: programVersion.workflowPermitsAutoAward,
      awardsCreated,
    });

    const assessmentReference = `${BENEFIT_ELIGIBILITY_ASSESSMENT_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const outcome =
      calculation.preliminaryEligible && !calculation.requiresHumanDecision
        ? BenefitEligibilityOutcome.PRELIMINARILY_ELIGIBLE
        : calculation.preliminaryEligible
          ? BenefitEligibilityOutcome.REQUIRES_HUMAN_DECISION
          : BenefitEligibilityOutcome.UNDETERMINED;

    const assessment = await this.prisma.benefitEligibilityAssessment.create({
      data: {
        id: randomUUID(),
        assessmentReference,
        benefitApplicationProfileId: input.benefitApplicationProfileId,
        benefitProgramId: input.benefitProgramId,
        benefitProgramVersionId: input.benefitProgramVersionId,
        eligibilityRuleVersionReference: input.eligibilityRuleVersionReference,
        status: BenefitEligibilityAssessmentStatus.PRELIMINARY,
        outcome,
        inputFacts: input.inputFacts as Prisma.InputJsonValue,
        assessmentResult: calculation as unknown as Prisma.InputJsonValue,
        requiresHumanDecision: programVersion.humanDecisionRequired,
        humanDecisionRecorded: false,
        doesNotCreateBenefitAward: true,
        actorPersona: input.actorPersona,
        assessedAt: new Date(),
      },
    });

    return { assessment, benefitAwardsCreated: 0 };
  }
}
