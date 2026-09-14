import {
  ComplianceImmediateActionRoute,
  ComplianceRiskLevel,
  CorrectiveActionPlanStatus,
} from '@prisma/client';

import { InspectionComplianceBoundaryService } from './common/inspection-compliance-boundary.service';
import {
  AI_ACTOR_ROLE_MARKER,
  HOLDER_ROLE_MARKER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from './inspection-compliance.constants';

describe('Phase 9E corrective action invariants', () => {
  const boundary = new InspectionComplianceBoundaryService();

  it('prevents holder from marking corrective action verified complete', () => {
    expect(() =>
      boundary.assertHolderCannotVerifyCorrectiveAction({
        actorRoleMarker: HOLDER_ROLE_MARKER,
        targetStatus: CorrectiveActionPlanStatus.VERIFIED_COMPLETE,
      }),
    ).toThrow('holder cannot mark corrective action as verified complete');
  });

  it('treats submission as distinct from verification', () => {
    expect(() =>
      boundary.assertSubmissionIsNotVerification({ treatingSubmissionAsVerified: true }),
    ).toThrow('submission remains a claim pending independent verification');
  });

  it('blocks closure when partial verification leaves actions open', () => {
    expect(() =>
      boundary.assertPartialVerificationDoesNotCloseAllActions({
        totalItems: 3,
        verifiedItems: 1,
        attemptingFullClosure: true,
      }),
    ).toThrow('Partial verification cannot close all corrective action items');
  });

  it('blocks closure while reinspection requirement is pending', () => {
    expect(() =>
      boundary.assertReinspectionBlocksClosure({ pendingReinspectionCount: 1 }),
    ).toThrow('required reinspection is completed');
  });

  it('requires attributable closure reviewer', () => {
    expect(() =>
      boundary.assertClosureRequiresAttribution({
        reviewerOfficeholderId: undefined,
        reviewerIdentityId: 'identity-id',
      }),
    ).toThrow('must be attributable');
  });

  it('preserves reopening without erasing closure requirement conceptually', () => {
    expect(() =>
      boundary.assertHolderCannotCloseFinding({ actorRoleMarker: HOLDER_ROLE_MARKER }),
    ).toThrow('holder cannot close');
  });

  it('does not auto-revoke on overdue (explicit guard)', () => {
    expect(() => boundary.assertOverdueDoesNotAutoRevoke()).not.toThrow();
  });

  it('routes critical risk outside CAPA-only workflow', () => {
    expect(() =>
      boundary.assertImmediateRiskRoutesOutsideCapa({
        riskLevel: ComplianceRiskLevel.CRITICAL,
        immediateActionRoute: ComplianceImmediateActionRoute.PHASE_8_SUSPENSION,
        attemptingCorrectiveActionOnly: true,
      }),
    ).toThrow('must not be delayed by corrective-action workflow alone');
  });

  it('prevents AI from closing findings', () => {
    expect(() =>
      boundary.assertAiCannotCloseFinding({ actorRoleMarker: AI_ACTOR_ROLE_MARKER }),
    ).toThrow('AI assistance cannot close');
  });

  it('prevents technical administrator substantive verification by role alone', () => {
    expect(() =>
      boundary.assertTechnicalAdminCannotVerifySubstantiveRemediation({
        actorRoleMarker: TECHNICAL_ADMIN_ROLE_MARKER,
        hasOfficeholderAuthority: false,
      }),
    ).toThrow('Technical administrators cannot verify substantive corrective remediation');
  });
});
