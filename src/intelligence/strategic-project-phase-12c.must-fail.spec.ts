import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CapitalEvidenceClassification,
  EmploymentEvidenceClassification,
  PerformanceClaimReviewStatus,
  StrategicProjectDependencyOwnerType,
  StrategicProjectDependencyType,
  StrategicProjectLifecycleStage,
  StrategicProjectMilestoneStatus,
} from '@prisma/client';

import { StrategicProjectBoundaryService } from './common/strategic-project-boundary.service';
import { PHASE_12C_INVARIANTS } from './intelligence.constants';

describe('Phase 12C strategic project must-fail invariants', () => {
  const boundary = new StrategicProjectBoundaryService();

  it('declares the expected invariant count', () => {
    expect(PHASE_12C_INVARIANTS).toHaveLength(14);
  });

  it('rejects inquiry mapped to qualified application state', () => {
    expect(() => {
      boundary.assertInquiryIsNotQualifiedApplication(
        StrategicProjectLifecycleStage.INQUIRY,
        'qualified-application-state',
      );
    }).toThrow(BadRequestException);
  });

  it('rejects project announcement treated as operational', () => {
    expect(() => {
      boundary.assertAnnouncementIsNotOperational(StrategicProjectLifecycleStage.OPERATIONAL, true);
    }).toThrow(BadRequestException);
  });

  it('rejects planned milestone jumping to completed', () => {
    expect(() => {
      boundary.assertMilestoneStatusTransition(
        StrategicProjectMilestoneStatus.PLANNED,
        StrategicProjectMilestoneStatus.COMPLETED,
      );
    }).toThrow(BadRequestException);
  });

  it('rejects reported milestone treated as verified', () => {
    expect(() => {
      boundary.assertMilestoneStatusTransition(
        StrategicProjectMilestoneStatus.REPORTED,
        StrategicProjectMilestoneStatus.VERIFIED,
      );
    }).toThrow(BadRequestException);
  });

  it('rejects proposed capital escalated to committed without proper steps', () => {
    expect(() => {
      boundary.assertCapitalEscalationRequiresEvidence(
        CapitalEvidenceClassification.PROPOSED,
        CapitalEvidenceClassification.COMMITTED,
        true,
      );
    }).toThrow(BadRequestException);
  });

  it('rejects committed capital treated as deployed', () => {
    expect(() => {
      boundary.assertCapitalEscalationRequiresEvidence(
        CapitalEvidenceClassification.COMMITTED,
        CapitalEvidenceClassification.DEPLOYED,
        true,
      );
    }).toThrow(BadRequestException);
  });

  it('rejects capital escalation without evidence', () => {
    expect(() => {
      boundary.assertCapitalEscalationRequiresEvidence(
        CapitalEvidenceClassification.PROPOSED,
        CapitalEvidenceClassification.INDICATED,
        false,
      );
    }).toThrow(BadRequestException);
  });

  it('rejects dashboard status as infrastructure completion proof', () => {
    expect(() => {
      boundary.assertDashboardIsNotInfrastructureProof({
        digitalTwinStatus: 'complete',
        dashboardStatus: 'green',
        physicalCompletionVerified: false,
        targetStage: 'OPERATIONAL',
      });
    }).toThrow(BadRequestException);
  });

  it('rejects applicant assertion verified without independent verification', () => {
    expect(() => {
      boundary.assertApplicantAssertionRequiresIndependentVerification({
        isApplicantAssertion: true,
        independentVerificationRefs: [],
        targetReviewStatus: PerformanceClaimReviewStatus.VERIFIED,
      });
    }).toThrow(BadRequestException);
  });

  it('rejects government dependency with non-government owner', () => {
    expect(() => {
      boundary.assertGovernmentDependencyOwnerPreserved({
        dependencyType: 'GOVERNMENT',
        ownerType: 'APPLICANT',
        isGovernmentOwned: false,
      });
    }).toThrow(BadRequestException);
  });

  it('rejects risk records that could affect approval', () => {
    expect(() => {
      boundary.assertRiskDoesNotAffectApproval(false);
    }).toThrow(BadRequestException);
  });

  it('rejects AI promoting project stage', () => {
    expect(() => {
      boundary.assertAiCannotPerformStrategicProjectAction('PROMOTE_PROJECT_STAGE', true);
    }).toThrow(ForbiddenException);
  });

  it('rejects advancing to approval when adverse status is preserved', () => {
    expect(() => {
      boundary.assertAdverseStatusPreserved(true, StrategicProjectLifecycleStage.APPROVED);
    }).toThrow(BadRequestException);
  });

  it('rejects public economic claim without completed review', () => {
    expect(() => {
      boundary.assertPublicEconomicClaimRequiresReview(PerformanceClaimReviewStatus.DRAFT);
    }).toThrow(BadRequestException);
  });

  it('rejects client attempts to set protected project status fields', () => {
    expect(() => {
      boundary.rejectClientProtectedProjectFields({ currentStage: 'OPERATIONAL' });
    }).toThrow(ForbiddenException);
  });

  it('rejects stage without institutional state reference', () => {
    expect(() => {
      boundary.assertStageRequiresInstitutionalStateReference('');
    }).toThrow(BadRequestException);
  });

  it('rejects sector observation without attribution metadata', () => {
    expect(() => {
      boundary.assertAttributionMetadataPresent({});
    }).toThrow(BadRequestException);
  });

  it('accepts government dependency with explicit government owner', () => {
    expect(() => {
      boundary.assertGovernmentDependencyOwnerPreserved({
        dependencyType: StrategicProjectDependencyType.GOVERNMENT,
        ownerType: StrategicProjectDependencyOwnerType.GOVERNMENT,
        isGovernmentOwned: true,
      });
    }).not.toThrow();
  });

  it('confirms forecast employment is not counted as verified', () => {
    expect(
      boundary.assertEmploymentClassificationCountsAsVerified(
        EmploymentEvidenceClassification.FORECAST,
      ),
    ).toBe(false);
    expect(
      boundary.assertEmploymentClassificationCountsAsVerified(
        EmploymentEvidenceClassification.ACTIVE_VERIFIED,
      ),
    ).toBe(true);
  });
});
