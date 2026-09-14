import { type INestApplication } from '@nestjs/common';
import {
  ComplianceEscalationType,
  NoncomplianceMateriality,
  NoncomplianceSeverity,
  OfficialInstrumentStatus,
  ProtectiveActionRecommendationType,
  RetainedEnforcementAuthorityClass,
} from '@prisma/client';

import { ComplianceAssessmentService } from '../src/inspection-compliance/assessment/compliance-assessment.service';
import { EmergencyInterimActionService } from '../src/inspection-compliance/emergency/emergency-interim-action.service';
import { ComplianceEscalationService } from '../src/inspection-compliance/escalation/compliance-escalation.service';
import { NoncomplianceFindingService } from '../src/inspection-compliance/findings/noncompliance-finding.service';
import { PHASE_9F_BOUNDARY_DISCLAIMER } from '../src/inspection-compliance/inspection-compliance.constants';
import { PHASE_9F_INVARIANTS } from '../src/inspection-compliance/inspection-compliance-phase-9f.constants';
import { ProtectiveActionRecommendationService } from '../src/inspection-compliance/protective/protective-action-recommendation.service';
import { EnforcementReferralService } from '../src/inspection-compliance/referral/enforcement-referral.service';
import { createIntegrationApp } from './helpers/integration-app';

describe('Phase 9F must-fail invariants (e2e)', () => {
  let app: INestApplication;
  let assessment: ComplianceAssessmentService;
  let finding: NoncomplianceFindingService;
  let escalation: ComplianceEscalationService;
  let referral: EnforcementReferralService;
  let protective: ProtectiveActionRecommendationService;
  let emergency: EmergencyInterimActionService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    assessment = app.get(ComplianceAssessmentService);
    finding = app.get(NoncomplianceFindingService);
    escalation = app.get(ComplianceEscalationService);
    referral = app.get(EnforcementReferralService);
    protective = app.get(ProtectiveActionRecommendationService);
    emergency = app.get(EmergencyInterimActionService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('defines exactly 13 Phase 9F invariants', () => {
    expect(PHASE_9F_INVARIANTS).toHaveLength(13);
    expect(new Set(PHASE_9F_INVARIANTS.map((item) => item.id)).size).toBe(13);
  });

  it('1. overdue obligation does not equal violation', () => {
    expect(assessment.signalIsViolation('overdue_obligation')).toBe(false);
    expect(assessment.complianceSignalMessage('overdue_obligation')).toMatch(/overdue obligation/i);
  });

  it('2. risk score does not equal violation', () => {
    expect(assessment.signalIsViolation('risk_score')).toBe(false);
  });

  it('3. AI alert does not equal violation', () => {
    expect(assessment.signalIsViolation('ai_alert')).toBe(false);
  });

  it('4. finding requires authorized human action', async () => {
    await expect(
      finding.confirm({
        findingId: '00000000-0000-4000-8000-000000000001',
        confirmedByIdentityId: '00000000-0000-4000-8000-000000000002',
        confirmedByOfficeholderId: '00000000-0000-4000-8000-000000000003',
        functionAuthorityRecordId: '00000000-0000-4000-8000-000000000004',
        isAiActor: true,
      }),
    ).rejects.toThrow();
  });

  it('5. referral does not equal prosecution', () => {
    expect(referral.referralIsProsecution()).toBe(false);
  });

  it('6. referral does not equal government decision', () => {
    expect(referral.referralIsGovernmentDecision()).toBe(false);
  });

  it('7. criminal referral preserves national authority', () => {
    expect(referral.isRetainedAuthority(RetainedEnforcementAuthorityClass.CRIMINAL)).toBe(true);
    expect(referral.retainedAuthorityMessage()).toMatch(/national authority/i);
  });

  it('8. protective recommendation cannot change instrument', () => {
    expect(protective.recommendationChangesInstrumentStatus()).toBe(false);
  });

  it('9. actual suspension invokes Phase 8', () => {
    expect(() =>
      escalation.attemptDirectInstrumentStatusChange(
        '00000000-0000-4000-8000-000000000001',
        OfficialInstrumentStatus.SUSPENDED,
      ),
    ).toThrow(/Phase 8/i);
  });

  it('10. actual revocation invokes Phase 8', () => {
    expect(() =>
      escalation.attemptDirectInstrumentStatusChange(
        '00000000-0000-4000-8000-000000000001',
        OfficialInstrumentStatus.REVOKED,
      ),
    ).toThrow(/Phase 8/i);
  });

  it('11. emergency interim action is time-limited and separately reviewed', () => {
    expect(emergency.isFinalDetermination()).toBe(false);
    expect(emergency.interimActionBoundaryMessage()).toMatch(/review/i);
  });

  it('12. technical admin cannot impose sanction', async () => {
    await expect(
      finding.confirm({
        findingId: '00000000-0000-4000-8000-000000000001',
        confirmedByIdentityId: '00000000-0000-4000-8000-000000000002',
        confirmedByOfficeholderId: '00000000-0000-4000-8000-000000000003',
        functionAuthorityRecordId: '00000000-0000-4000-8000-000000000004',
        isTechnicalAdminOnly: true,
      }),
    ).rejects.toThrow(/Technical administrative authority cannot impose sanctions/i);
  });

  it('13. CaseAssignment cannot create enforcement authority', async () => {
    await expect(
      finding.confirm({
        findingId: '00000000-0000-4000-8000-000000000001',
        confirmedByIdentityId: '00000000-0000-4000-8000-000000000002',
        confirmedByOfficeholderId: '00000000-0000-4000-8000-000000000003',
        functionAuthorityRecordId: '00000000-0000-4000-8000-000000000004',
        hasCaseAssignmentOnly: true,
      }),
    ).rejects.toThrow(/Case assignment does not create enforcement authority/i);
  });

  it('states Phase 9F boundary disclaimer explicitly', () => {
    expect(PHASE_9F_BOUNDARY_DISCLAIMER).toMatch(/Compliance signals are not violations/i);
    expect(PHASE_9F_BOUNDARY_DISCLAIMER).toMatch(/Referrals are not prosecutions/i);
  });

  it('escalation types include Phase 8 review without bypassing authority', () => {
    expect(ComplianceEscalationType.PHASE_8_SUSPENSION_REVIEW).toBe('PHASE_8_SUSPENSION_REVIEW');
    expect(ComplianceEscalationType.PHASE_8_REVOCATION_REVIEW).toBe('PHASE_8_REVOCATION_REVIEW');
    expect(escalation.escalationBypassesAuthority()).toBe(false);
  });

  it('protective recommendations route suspension/revocation to Phase 8 review', () => {
    expect(ProtectiveActionRecommendationType.SUSPENSION_REVIEW).toBe('SUSPENSION_REVIEW');
    expect(ProtectiveActionRecommendationType.REVOCATION_REVIEW).toBe('REVOCATION_REVIEW');
    protective.assertPhase8ReviewRecommendation(ProtectiveActionRecommendationType.SUSPENSION_REVIEW);
  });

  it('AI-proposed finding proposal does not auto-confirm', async () => {
    expect(NoncomplianceSeverity.HIGH).toBeDefined();
    expect(NoncomplianceMateriality.SIGNIFICANT).toBeDefined();
    await expect(
      finding.rejectAiAutoConfirmation('00000000-0000-4000-8000-000000000001'),
    ).rejects.toThrow();
  });
});
