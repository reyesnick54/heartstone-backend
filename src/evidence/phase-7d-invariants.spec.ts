import { ForbiddenException } from '@nestjs/common';
import {
  DepartmentalReviewStatus,
  GovernmentCommunicationAuthenticationStatus,
  GovernmentCommunicationCategory,
  InspectionFindingClassification,
  ProfessionalSignatureSource,
} from '@prisma/client';

import { GovernmentCommunicationService } from './communications/government-communication.service';
import { EvidenceCustodyService } from './custody/evidence-custody.service';
import { InspectionService } from './inspection/inspection.service';
import { ProfessionalReviewService } from './professional/professional-review.service';
import { DepartmentalReviewService } from './reviews/departmental-review.service';

describe('Phase 7D institutional invariants', () => {
  const governmentCommunication = new GovernmentCommunicationService({} as never);
  const professionalReview = new ProfessionalReviewService({} as never);
  const inspection = new InspectionService({} as never);
  const custody = new EvidenceCustodyService({} as never);
  const departmentalReview = new DepartmentalReviewService({} as never, {} as never);

  it('government acknowledgment is not approval', () => {
    const result = governmentCommunication.assertAcknowledgmentIsNotApproval(
      GovernmentCommunicationCategory.ACKNOWLEDGMENT,
    );
    expect(result).toEqual({ constitutesApproval: false, constitutesConcurrence: false });
    expect(
      governmentCommunication.isApprovalEquivalent(GovernmentCommunicationCategory.ACKNOWLEDGMENT),
    ).toBe(false);
  });

  it('government silence is not concurrence', () => {
    expect(governmentCommunication.assertSilenceIsNotConcurrence(false)).toEqual({
      constitutesConcurrence: false,
    });
  });

  it('consultation is not concurrence', () => {
    expect(
      governmentCommunication.assertConsultationIsNotConcurrence(
        GovernmentCommunicationCategory.CONSULTATION,
      ),
    ).toEqual({ constitutesConcurrence: false });
  });

  it('receipt is not concurrence', () => {
    expect(
      governmentCommunication.isApprovalEquivalent(GovernmentCommunicationCategory.RECEIPT),
    ).toBe(false);
  });

  it('AI cannot sign professional record', async () => {
    const prisma = {
      professionalReviewRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rev-1',
          professionalIdentityId: 'id-1',
          scopeOfEngagement: 'Structural assessment',
          findings: 'Load-bearing wall adequate',
        }),
        update: jest.fn(),
      },
    };

    const service = new ProfessionalReviewService(prisma as never);

    await expect(
      service.signProfessionalOpinion({
        reviewId: 'rev-1',
        professionalIdentityId: 'id-1',
        signatureReference: 'sig-ai',
        signatureSource: ProfessionalSignatureSource.AI_ASSISTANCE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('professional finding cannot exceed recorded scope', () => {
    expect(() => { professionalReview.assertFindingWithinScope(
        'Desktop document review only',
        'Site is in violation and must be closed immediately',
        true,
      ); },
    ).toThrow('cannot exceed recorded scope');
  });

  it('inspection observation is not automatically a violation', () => {
    expect(
      inspection.observationIsViolation(InspectionFindingClassification.OBSERVATION),
    ).toBe(false);
    expect(
      inspection.observationIsViolation(InspectionFindingClassification.NON_COMPLIANCE),
    ).toBe(true);
  });

  it('custody events do not claim scientific validity', () => {
    const result = custody.assertDoesNotClaimScientificValidity('ANALYZED');
    expect(result?.claimsScientificValidity).toBe(false);
  });

  it('departmental reviews remain separately attributable and may disagree', () => {
    const reviews = [
      {
        departmentId: 'dept-a',
        findings: 'Adequate for planning',
        status: DepartmentalReviewStatus.COMPLETED,
      },
      {
        departmentId: 'dept-b',
        findings: 'Environmental concerns remain',
        status: DepartmentalReviewStatus.COMPLETED,
      },
    ];

    expect(() => { departmentalReview.assertDepartmentsMayDisagree(reviews); }).not.toThrow();
  });

  it('rejects collapsed duplicate departmental attributions', () => {
    const reviews = [
      {
        departmentId: 'dept-a',
        findings: 'Collapsed merged finding',
        status: DepartmentalReviewStatus.COMPLETED,
      },
      {
        departmentId: 'dept-a',
        findings: 'Collapsed merged finding',
        status: DepartmentalReviewStatus.COMPLETED,
      },
    ];

    expect(() => { departmentalReview.assertDepartmentsMayDisagree(reviews); }).toThrow(
      'false unanimity',
    );
  });

  it('consequential government categories require authentication', async () => {
    const prisma = {
      case: { findUnique: jest.fn().mockResolvedValue({ id: 'case-1' }) },
      governmentCommunicationRecord: { create: jest.fn() },
    };
    const service = new GovernmentCommunicationService(prisma as never);

    await expect(
      service.record({
        caseId: 'case-1',
        category: GovernmentCommunicationCategory.CONCURRENCE,
        sourceInstitutionId: 'inst-1',
        authenticationStatus: GovernmentCommunicationAuthenticationStatus.UNAUTHENTICATED,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
