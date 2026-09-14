import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityEvaluationOutcome,
  DelegationStatus,
  IdentityType,
  ReviewerIndependenceOutcome,
  ReviewProceedingKind,
} from '@prisma/client';

import { RedressBoundaryService } from '../common/redress-boundary.service';
import { ReviewAssignmentService } from './review-assignment.service';
import { ReviewerIndependenceService } from './reviewer-independence.service';

describe('ReviewAssignmentService', () => {
  const prisma = {
    identity: { findUnique: jest.fn() },
    officeholder: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn() },
    delegation: { findUnique: jest.fn() },
    reconsiderationProceeding: { findUnique: jest.fn() },
    internalAdministrativeReview: { findUnique: jest.fn() },
    reviewAssignment: { create: jest.fn(), update: jest.fn(), count: jest.fn() },
    reviewAuthorityAssessment: { create: jest.fn() },
  };
  const boundary = new RedressBoundaryService();
  const authorityEvaluation = { evaluate: jest.fn() };
  const independenceService = {
    assessIndependence: jest.fn(),
    assertAssignmentPermitted: (
      outcome: Parameters<ReviewerIndependenceService['assertAssignmentPermitted']>[0],
    ) => {
      new ReviewerIndependenceService(prisma as never, boundary).assertAssignmentPermitted(outcome);
    },
  };

  let service: ReviewAssignmentService;

  const baseInput = {
    proceedingKind: ReviewProceedingKind.RECONSIDERATION,
    reconsiderationProceedingId: 'proceeding-1',
    reviewerIdentityId: 'reviewer-1',
    reviewerIdentityType: IdentityType.INDIVIDUAL,
    reviewerOfficeholderId: 'officeholder-1',
    appointmentId: 'appt-1',
    jurisdictionId: 'jur-1',
    functionAuthorityRecordId: 'far-1',
    scope: 'Reconsideration review',
    requiredReviewerLevel: 'L2',
    reviewerLevel: 'L2',
    originalDecisionMakerIdentityId: 'decision-maker-1',
    at: new Date('2025-06-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewAssignmentService(
      prisma as never,
      boundary,
      authorityEvaluation as never,
      independenceService as never,
    );

    prisma.reconsiderationProceeding.findUnique.mockResolvedValue({
      id: 'proceeding-1',
      jurisdictionId: 'jur-1',
      requiredReviewerLevel: 'L2',
    });
    prisma.identity.findUnique.mockResolvedValue({ id: 'reviewer-1' });
    prisma.officeholder.findUnique.mockResolvedValue({ id: 'officeholder-1' });
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      officeholderId: 'officeholder-1',
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: null,
    });
    prisma.reviewAssignment.count.mockResolvedValue(0);
    prisma.reviewAssignment.create.mockResolvedValue({ id: 'assignment-1' });
    prisma.reviewAssignment.update.mockResolvedValue({
      id: 'assignment-1',
      status: 'ACTIVE',
    });
    independenceService.assessIndependence.mockResolvedValue({
      outcome: ReviewerIndependenceOutcome.INDEPENDENT,
    });
    authorityEvaluation.evaluate.mockResolvedValue({
      evaluationId: 'eval-1',
      outcome: AuthorityEvaluationOutcome.ALLOW,
    });
  });

  it('blocks expired appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      officeholderId: 'officeholder-1',
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: new Date('2021-01-01'),
    });

    await expect(service.assignReviewer(baseInput)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks revoked delegation', async () => {
    prisma.delegation.findUnique.mockResolvedValue({
      id: 'delegation-1',
      status: DelegationStatus.REVOKED,
    });

    await expect(
      service.assignReviewer({ ...baseInput, delegationId: 'delegation-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks wrong jurisdiction', async () => {
    await expect(
      service.assignReviewer({ ...baseInput, jurisdictionId: 'wrong-jur' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires current authority via Phase 4 evaluation', async () => {
    authorityEvaluation.evaluate.mockResolvedValue({
      evaluationId: 'eval-1',
      outcome: AuthorityEvaluationOutcome.DENY,
    });

    await expect(service.assignReviewer(baseInput)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates assignment without granting review authority by itself', async () => {
    const result = await service.assignReviewer(baseInput);

    expect(result.status).toBe('ACTIVE');
    expect(service.assignmentCreatesAuthority()).toBe(false);
    expect(prisma.reviewAuthorityAssessment.create).toHaveBeenCalled();
  });
});
