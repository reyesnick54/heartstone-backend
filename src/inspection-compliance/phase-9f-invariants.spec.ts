import { ForbiddenException } from '@nestjs/common';
import {
  ComplianceEscalationType,
  DecisionConditionStatus,
  NoncomplianceFindingStatus,
  NoncomplianceMateriality,
  NoncomplianceSeverity,
  OfficialInstrumentStatus,
  ProtectiveActionRecommendationType,
  RetainedEnforcementAuthorityClass,
} from '@prisma/client';

import { type AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { type PrismaService } from '../database/prisma.service';
import { ComplianceAssessmentService } from './assessment/compliance-assessment.service';
import { EmergencyInterimActionService } from './emergency/emergency-interim-action.service';
import { ComplianceEscalationService } from './escalation/compliance-escalation.service';
import { NoncomplianceFindingService } from './findings/noncompliance-finding.service';
import {
  AI_ALERT_NOT_VIOLATION_MESSAGE,
  OVERDUE_OBLIGATION_NOT_VIOLATION_MESSAGE,
  PHASE_9F_BOUNDARY_DISCLAIMER,
  RISK_SCORE_NOT_VIOLATION_MESSAGE,
} from './inspection-compliance.constants';
import { PHASE_9F_INVARIANTS } from './inspection-compliance-phase-9f.constants';
import { ProtectiveActionRecommendationService } from './protective/protective-action-recommendation.service';
import { EnforcementReferralService } from './referral/enforcement-referral.service';

describe('Phase 9F invariants', () => {
  const prisma = {
    case: { findUnique: jest.fn() },
    complianceAssessment: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    noncomplianceFinding: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    governmentDecision: { findMany: jest.fn() },
    identity: { findUnique: jest.fn() },
    officialInstrument: { findUnique: jest.fn() },
    enforcementReferral: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    protectiveActionRecommendation: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    emergencyInterimActionRecord: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    complianceEscalation: { create: jest.fn() },
  } as unknown as PrismaService;

  const authorityEvaluation = {
    evaluate: jest.fn().mockResolvedValue({ evaluationId: 'auth-eval-1', outcome: 'ALLOW' }),
  } as unknown as AuthorityEvaluationService;

  const assessmentService = new ComplianceAssessmentService(prisma);
  const findingService = new NoncomplianceFindingService(prisma, authorityEvaluation);
  const escalationService = new ComplianceEscalationService(prisma, authorityEvaluation);
  const referralService = new EnforcementReferralService(prisma, authorityEvaluation);
  const protectiveService = new ProtectiveActionRecommendationService(prisma, authorityEvaluation);
  const emergencyService = new EmergencyInterimActionService(prisma, authorityEvaluation);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.case.findUnique as jest.Mock).mockResolvedValue({ id: 'case-1' });
  });

  it('defines exactly 13 Phase 9F invariants', () => {
    expect(PHASE_9F_INVARIANTS).toHaveLength(13);
    expect(new Set(PHASE_9F_INVARIANTS.map((item) => item.id)).size).toBe(13);
  });

  it('1. overdue obligation does not equal violation', async () => {
    (prisma.governmentDecision.findMany as jest.Mock).mockResolvedValue([
      {
        conditions: [
          { id: 'cond-1', status: DecisionConditionStatus.OVERDUE, dueAt: new Date('2020-01-01') },
        ],
      },
    ]);

    const result = await assessmentService.reviewOverdueObligations('case-1');
    expect(result.overdueObligationIds).toContain('cond-1');
    expect(result.createsViolation).toBe(false);
    expect(result.message).toBe(OVERDUE_OBLIGATION_NOT_VIOLATION_MESSAGE);
    expect(assessmentService.signalIsViolation('overdue_obligation')).toBe(false);
  });

  it('2. risk score does not equal violation', () => {
    expect(assessmentService.signalIsViolation('risk_score')).toBe(false);
    expect(assessmentService.complianceSignalMessage('risk_score')).toBe(
      RISK_SCORE_NOT_VIOLATION_MESSAGE,
    );
  });

  it('3. AI alert does not equal violation', () => {
    expect(assessmentService.signalIsViolation('ai_alert')).toBe(false);
    expect(assessmentService.complianceSignalMessage('ai_alert')).toBe(
      AI_ALERT_NOT_VIOLATION_MESSAGE,
    );
  });

  it('4. finding requires authorized human action', async () => {
    (prisma.noncomplianceFinding.findUnique as jest.Mock).mockResolvedValue({
      id: 'finding-1',
      status: NoncomplianceFindingStatus.PROPOSED,
      isAiProposed: true,
    });

    await expect(
      findingService.confirm({
        findingId: 'finding-1',
        confirmedByIdentityId: 'ai-identity',
        confirmedByOfficeholderId: 'officeholder-1',
        functionAuthorityRecordId: 'far-1',
        isAiActor: true,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. referral does not equal prosecution', () => {
    expect(referralService.referralIsProsecution()).toBe(false);
    expect(referralService.referralBoundaryMessage()).toMatch(/prosecution/i);
  });

  it('6. referral does not equal government decision', () => {
    expect(referralService.referralIsGovernmentDecision()).toBe(false);
    expect(referralService.referralBoundaryMessage()).toMatch(/government decision/i);
  });

  it('7. criminal referral preserves national authority', () => {
    expect(referralService.isRetainedAuthority(RetainedEnforcementAuthorityClass.CRIMINAL)).toBe(
      true,
    );
    expect(referralService.retainedAuthorityMessage()).toMatch(/national authority/i);
  });

  it('8. protective recommendation cannot change instrument', async () => {
    (prisma.officialInstrument.findUnique as jest.Mock).mockResolvedValue({
      id: 'instrument-1',
      status: OfficialInstrumentStatus.ISSUED,
    });

    expect(protectiveService.recommendationChangesInstrumentStatus()).toBe(false);
    await expect(
      protectiveService.attemptInstrumentStatusChange(
        'instrument-1',
        OfficialInstrumentStatus.SUSPENDED,
      ),
    ).rejects.toThrow(
      /Protective action recommendations do not change official instrument status/i,
    );
  });

  it('9. actual suspension invokes Phase 8', () => {
    expect(() =>
      escalationService.attemptDirectInstrumentStatusChange(
        'instrument-1',
        OfficialInstrumentStatus.SUSPENDED,
      ),
    ).toThrow(/Phase 8/i);
  });

  it('10. actual revocation invokes Phase 8', () => {
    expect(() =>
      escalationService.attemptDirectInstrumentStatusChange(
        'instrument-1',
        OfficialInstrumentStatus.REVOKED,
      ),
    ).toThrow(/Phase 8/i);
  });

  it('11. emergency interim action is time-limited and separately reviewed', () => {
    expect(emergencyService.isFinalDetermination()).toBe(false);
    expect(emergencyService.interimActionBoundaryMessage()).toMatch(/time-limited/i);
    expect(emergencyService.interimActionBoundaryMessage()).toMatch(/review/i);

    expect(() => {
      emergencyService.assertTimeLimited(
        new Date('2026-01-01'),
        new Date('2026-01-01'),
        new Date('2026-02-01'),
      );
    }).toThrow(/positive duration/i);
  });

  it('12. technical admin cannot impose sanction', async () => {
    (prisma.noncomplianceFinding.findUnique as jest.Mock).mockResolvedValue({
      id: 'finding-1',
      status: NoncomplianceFindingStatus.DRAFT,
      isAiProposed: false,
    });

    await expect(
      findingService.confirm({
        findingId: 'finding-1',
        confirmedByIdentityId: 'admin-identity',
        confirmedByOfficeholderId: 'officeholder-1',
        functionAuthorityRecordId: 'far-1',
        isTechnicalAdminOnly: true,
      }),
    ).rejects.toThrow(/Technical administrative authority cannot impose sanctions/i);
  });

  it('13. CaseAssignment cannot create enforcement authority', async () => {
    (prisma.noncomplianceFinding.findUnique as jest.Mock).mockResolvedValue({
      id: 'finding-1',
      status: NoncomplianceFindingStatus.DRAFT,
      isAiProposed: false,
    });

    await expect(
      findingService.confirm({
        findingId: 'finding-1',
        confirmedByIdentityId: 'assignee-identity',
        confirmedByOfficeholderId: 'officeholder-1',
        functionAuthorityRecordId: 'far-1',
        hasCaseAssignmentOnly: true,
      }),
    ).rejects.toThrow(/Case assignment does not create enforcement authority/i);
  });

  it('states Phase 9F boundary disclaimer explicitly', () => {
    expect(PHASE_9F_BOUNDARY_DISCLAIMER).toMatch(/Compliance signals are not violations/i);
    expect(PHASE_9F_BOUNDARY_DISCLAIMER).toMatch(/Phase 8/i);
  });

  it('creates AI-proposed findings in PROPOSED status only', async () => {
    (prisma.noncomplianceFinding.create as jest.Mock).mockResolvedValue({
      id: 'finding-ai',
      status: NoncomplianceFindingStatus.PROPOSED,
      isAiProposed: true,
    });

    const finding = await findingService.propose({
      caseId: 'case-1',
      requirementSource: 'Condition 1',
      facts: 'Missed reporting deadline',
      responsibleSubjectType: 'LICENSEE',
      responsibleSubjectReference: 'licensee-1',
      scope: 'Reporting obligation',
      severity: NoncomplianceSeverity.MEDIUM,
      materiality: NoncomplianceMateriality.MATERIAL,
      isAiProposed: true,
    });

    expect(finding.status).toBe(NoncomplianceFindingStatus.PROPOSED);
    expect(finding.isAiProposed).toBe(true);
  });

  it('escalation does not bypass authority', () => {
    expect(escalationService.escalationBypassesAuthority()).toBe(false);
    escalationService.assertPhase8ReviewOnly(ComplianceEscalationType.PHASE_8_SUSPENSION_REVIEW);
    protectiveService.assertPhase8ReviewRecommendation(
      ProtectiveActionRecommendationType.SUSPENSION_REVIEW,
    );
  });
});
