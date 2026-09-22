import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ClinicalSuitabilityOutcome,
  HealthcareActorPersona,
  TreatmentEligibilityReviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { TreatmentBoundaryService } from '../common/treatment-boundary.service';

export interface FinalizeClinicalReviewInput {
  reviewId: string;
  actorPersona: HealthcareActorPersona;
  actorIdentityId: string;
  clinicalSuitabilityOutcome: ClinicalSuitabilityOutcome;
  decisionBasisEvidenceReference?: string;
  governmentAdministrativeEvaluationId?: string | null;
}

@Injectable()
export class TreatmentEligibilityReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TreatmentBoundaryService,
  ) {}

  async finalizeClinicalReview(input: FinalizeClinicalReviewInput) {
    this.boundary.assertAiCannotFinalizeClinicalSuitability(
      input.actorPersona,
      'FINALIZE_CLINICAL_SUITABILITY',
    );
    this.boundary.assertPlatformAdminCannotMakeClinicalDecision(
      input.actorPersona,
      'FINALIZE_CLINICAL_SUITABILITY',
    );
    this.boundary.assertClinicalReviewRequiresProfessionalActor(input.actorPersona);

    const review = await this.prisma.treatmentEligibilityReview.findUnique({
      where: { id: input.reviewId },
    });
    if (!review) {
      throw new NotFoundException('Treatment eligibility review not found');
    }
    if (review.reviewStatus === TreatmentEligibilityReviewStatus.FINALIZED) {
      throw new BadRequestException('Clinical review is already finalized');
    }
    if (review.professionalIdentityId !== input.actorIdentityId) {
      throw new BadRequestException(
        'Clinical review must be finalized by the assigned professional identity',
      );
    }

    this.boundary.assertProfessionalLicenseValidForClinicalReview({
      licenseValidUntil: review.professionalLicenseValidUntil,
    });

    this.boundary.assertGovernmentAuthorityDoesNotSubstituteClinicalJudgment({
      requiresProfessionalJudgment: review.requiresProfessionalJudgment,
      clinicalOutcome: input.clinicalSuitabilityOutcome,
      onlyGovernmentEvaluationProvided:
        !!input.governmentAdministrativeEvaluationId &&
        input.clinicalSuitabilityOutcome !== ClinicalSuitabilityOutcome.PENDING &&
        input.actorPersona === HealthcareActorPersona.GOVERNMENT_OFFICIAL,
    });

    this.boundary.assertClinicalJudgmentDoesNotCreateUnrelatedGovernmentAuthority({
      clinicalOutcome: input.clinicalSuitabilityOutcome,
      unrelatedGovernmentAuthorityCreated: false,
    });

    return this.prisma.treatmentEligibilityReview.update({
      where: { id: input.reviewId },
      data: {
        reviewStatus: TreatmentEligibilityReviewStatus.FINALIZED,
        clinicalSuitabilityOutcome: input.clinicalSuitabilityOutcome,
        decisionBasisEvidenceReference: input.decisionBasisEvidenceReference,
        governmentAdministrativeEvaluationId: input.governmentAdministrativeEvaluationId,
        finalizedAt: new Date(),
      },
    });
  }
}
