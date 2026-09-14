import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ComplianceFindingClosureStatus,
  ComplianceImmediateActionRoute,
  ComplianceRiskLevel,
  CorrectiveActionPlanStatus,
  CorrectiveActionVerificationResult,
  InspectionFindingStatus,
  ReinspectionRequirementStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../common/inspection-compliance-boundary.service';
import {
  AI_ACTOR_ROLE_MARKER,
  HOLDER_ROLE_MARKER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../inspection-compliance.constants';
import { CorrectiveActionService } from './corrective-action.service';

describe('CorrectiveActionService', () => {
  let service: CorrectiveActionService;

  const prismaMock = {
    complianceMatter: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    inspectionFinding: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    correctiveActionPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    correctiveActionItem: { createMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    correctiveActionSubmission: { create: jest.fn() },
    correctiveActionSubmissionEvidence: { createMany: jest.fn() },
    correctiveActionVerification: { create: jest.fn() },
    correctiveActionVerificationEvidence: { createMany: jest.fn() },
    reinspectionRequirement: { create: jest.fn() },
    complianceFindingClosure: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    complianceFindingReopening: { create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const prisma = prismaMock as unknown as PrismaService;

  (prismaMock.$transaction as jest.Mock).mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
    prismaMock.complianceMatter.count.mockResolvedValue(0);
    prismaMock.inspectionFinding.count.mockResolvedValue(0);
    prismaMock.correctiveActionPlan.count.mockResolvedValue(0);
    prismaMock.complianceFindingClosure.count.mockResolvedValue(0);
    prismaMock.complianceFindingReopening.count.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CorrectiveActionService,
        InspectionComplianceBoundaryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CorrectiveActionService);
  });

  it('rejects corrective action plan when matter requires immediate protective route', async () => {
    prismaMock.complianceMatter.findUnique.mockResolvedValue({
      id: 'matter-1',
      immediateActionRoute: ComplianceImmediateActionRoute.PHASE_8_SUSPENSION,
      riskLevel: ComplianceRiskLevel.CRITICAL,
    });

    await expect(
      service.proposeCorrectiveActionPlan({
        complianceMatterId: 'matter-1',
        inspectionFindingId: 'finding-1',
        authoritySource: 'Inspector',
        rootCauseDescription: 'Process gap',
        requiredActions: 'Repair equipment',
        responsibleParty: 'Holder',
        dueDate: new Date('2026-10-01'),
        evidenceRequired: 'Photo evidence',
        verificationMethod: 'Site verification',
        actor: { identityId: 'reviewer-1' },
      }),
    ).rejects.toThrow('Corrective action workflow cannot substitute');
  });

  it('records holder submission without verifying plan', async () => {
    prismaMock.correctiveActionSubmission.create.mockResolvedValue({ id: 'sub-1' });
    prismaMock.correctiveActionPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      inspectionFindingId: 'finding-1',
    });
    prismaMock.correctiveActionPlan.update.mockResolvedValue({
      id: 'plan-1',
      status: CorrectiveActionPlanStatus.EVIDENCE_SUBMITTED,
    });

    const submission = await service.submitCorrectiveActionEvidence({
      planId: 'plan-1',
      submissionSummary: 'We uploaded repair photos',
      evidenceRecordIds: ['evidence-1'],
      submitter: { identityId: 'holder-1', roleMarker: HOLDER_ROLE_MARKER },
    });

    expect(submission).toEqual({ id: 'sub-1' });
    expect(prismaMock.correctiveActionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: CorrectiveActionPlanStatus.EVIDENCE_SUBMITTED },
      }),
    );
  });

  it('prevents holder from verifying corrective action complete', async () => {
    await expect(
      service.verifyCorrectiveAction({
        planId: 'plan-1',
        actionVerified: 'Repair complete',
        evidenceSummary: 'Verified onsite',
        verificationMethod: 'Inspection',
        result: CorrectiveActionVerificationResult.VERIFIED,
        verifier: {
          identityId: 'holder-1',
          officeholderId: 'officeholder-1',
          roleMarker: HOLDER_ROLE_MARKER,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates reinspection requirement when verification requires it', async () => {
    prismaMock.correctiveActionPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      inspectionFindingId: 'finding-1',
      items: [],
    });
    prismaMock.correctiveActionVerification.create.mockResolvedValue({ id: 'verification-1' });

    await service.verifyCorrectiveAction({
      planId: 'plan-1',
      actionVerified: 'Partial repair',
      evidenceSummary: 'Needs follow-up inspection',
      verificationMethod: 'Desk review',
      result: CorrectiveActionVerificationResult.REINSPECTION_REQUIRED,
      followUpRequired: 'Schedule follow-up site inspection',
      verifier: {
        identityId: 'reviewer-1',
        officeholderId: 'officeholder-1',
      },
    });

    expect(prismaMock.reinspectionRequirement.create).toHaveBeenCalled();
  });

  it('blocks finding closure while reinspection is pending', async () => {
    prismaMock.inspectionFinding.findUnique.mockResolvedValue({
      id: 'finding-1',
      complianceMatterId: 'matter-1',
      correctiveActionPlans: [{ status: CorrectiveActionPlanStatus.VERIFIED_COMPLETE, items: [] }],
      reinspectionRequirements: [{ status: ReinspectionRequirementStatus.REQUIRED }],
      closures: [],
    });

    await expect(
      service.closeInspectionFinding({
        findingId: 'finding-1',
        closureSummary: 'All resolved',
        requiredActionsCompleted: true,
        requiredEvidenceVerified: true,
        reinspectionCompleted: false,
        relatedIssuesResolved: true,
        reviewer: {
          identityId: 'reviewer-1',
          officeholderId: 'officeholder-1',
        },
      }),
    ).rejects.toThrow('reinspection');
  });

  it('records attributable closure with reviewer identity', async () => {
    prismaMock.inspectionFinding.findUnique.mockResolvedValue({
      id: 'finding-1',
      complianceMatterId: 'matter-1',
      correctiveActionPlans: [{ status: CorrectiveActionPlanStatus.VERIFIED_COMPLETE, items: [] }],
      reinspectionRequirements: [],
      closures: [],
    });
    prismaMock.complianceFindingClosure.create.mockResolvedValue({
      id: 'closure-1',
      closureNumber: 'CFC-00000001',
    });

    const closure = await service.closeInspectionFinding({
      findingId: 'finding-1',
      closureSummary: 'Verified complete',
      requiredActionsCompleted: true,
      requiredEvidenceVerified: true,
      reinspectionCompleted: true,
      relatedIssuesResolved: true,
      reviewer: {
        identityId: 'reviewer-1',
        officeholderId: 'officeholder-1',
      },
      authorityReference: 'AUTH-1',
    });

    expect(closure.closureNumber).toBe('CFC-00000001');
    expect(prismaMock.inspectionFinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InspectionFindingStatus.CLOSED }),
      }),
    );
  });

  it('reopens finding while superseding prior closure record', async () => {
    prismaMock.complianceFindingClosure.findUnique.mockResolvedValue({
      id: 'closure-1',
      status: ComplianceFindingClosureStatus.ACTIVE,
    });
    prismaMock.complianceFindingReopening.create.mockResolvedValue({ id: 'reopen-1' });
    prismaMock.inspectionFinding.findUnique.mockResolvedValue({ complianceMatterId: 'matter-1' });

    await service.reopenInspectionFinding({
      findingId: 'finding-1',
      priorClosureId: 'closure-1',
      reason: 'RECURRENCE',
      reasonDetail: 'Issue recurred after closure',
      reviewer: {
        identityId: 'reviewer-1',
        officeholderId: 'officeholder-1',
      },
    });

    expect(prismaMock.complianceFindingClosure.update).toHaveBeenCalledWith({
      where: { id: 'closure-1' },
      data: { status: ComplianceFindingClosureStatus.SUPERSEDED_BY_REOPENING },
    });
  });

  it('marks overdue without triggering revocation side effects', async () => {
    prismaMock.correctiveActionPlan.update.mockResolvedValue({
      id: 'plan-1',
      status: CorrectiveActionPlanStatus.OVERDUE,
    });

    const plan = await service.markCorrectiveActionOverdue('plan-1');
    expect(plan.status).toBe(CorrectiveActionPlanStatus.OVERDUE);
  });

  it('routes critical risk to Phase 8 suspension outside CAPA', async () => {
    prismaMock.complianceMatter.update.mockResolvedValue({
      id: 'matter-1',
      immediateActionRoute: ComplianceImmediateActionRoute.PHASE_8_SUSPENSION,
    });

    await service.routeImmediateRisk({
      matterId: 'matter-1',
      route: ComplianceImmediateActionRoute.PHASE_8_SUSPENSION,
      reason: 'Immediate safety risk',
    });

    expect(prismaMock.complianceMatter.update).toHaveBeenCalled();
  });

  it('rejects technical admin verification without officeholder authority', async () => {
    await expect(
      service.verifyCorrectiveAction({
        planId: 'plan-1',
        actionVerified: 'Done',
        evidenceSummary: 'Checked',
        verificationMethod: 'Review',
        result: CorrectiveActionVerificationResult.VERIFIED,
        verifier: {
          identityId: 'admin-1',
          roleMarker: TECHNICAL_ADMIN_ROLE_MARKER,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects AI actor attempting finding closure', async () => {
    await expect(
      service.closeInspectionFinding({
        findingId: 'finding-1',
        closureSummary: 'AI says close',
        requiredActionsCompleted: true,
        requiredEvidenceVerified: true,
        reinspectionCompleted: true,
        relatedIssuesResolved: true,
        reviewer: {
          identityId: 'ai-1',
          officeholderId: 'officeholder-1',
          roleMarker: AI_ACTOR_ROLE_MARKER,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
