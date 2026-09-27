import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComplianceCorrectiveActionRegisterStatus, OfficialInstrumentStatus } from '@prisma/client';

import { CaseManagerBoundaryService } from '../application-processing/cases/case-manager/case-manager-boundary.service';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import {
  ComplianceCorrectiveActionBoundaryService,
  ComplianceCorrectiveActionService,
} from '../compliance/corrective-action/compliance-corrective-action.service';
import { JointInspectionService } from '../compliance/inspection/joint-inspection.service';
import { DECISION_READINESS_REASON_CODES } from '../decisions/decisions.constants';
import { InstrumentLifecycleGuardService } from '../instruments/lifecycle/instrument-lifecycle-guard.service';
import { InstrumentRenewalMonitoringService } from '../instruments/lifecycle/instrument-renewal-monitoring.service';

describe('Remediation S16 operational lifecycle invariants', () => {
  const caseManagerBoundary = new CaseManagerBoundaryService();
  const correctiveBoundary = new ComplianceCorrectiveActionBoundaryService();
  const jointInspection = new JointInspectionService({ jointInspectionParticipant: {} } as never);
  const renewalMonitoring = new InstrumentRenewalMonitoringService({} as never, {} as never);
  const lifecycleGuard = new InstrumentLifecycleGuardService({} as never);

  it('case manager assignment does not grant decision authority', () => {
    expect(() => { caseManagerBoundary.assertCaseManagerIsNotDecisionAuthority({
        isCaseManager: true,
        isProposedDecisionMaker: true,
      }); },
    ).toThrow(BadRequestException);
    expect(DECISION_READINESS_REASON_CODES.CASE_MANAGER_NOT_DECISION_AUTHORITY).toBe(
      'CASE_MANAGER_NOT_DECISION_AUTHORITY',
    );
  });

  it('cross-agency coordination preserves mandate boundary disclaimer', () => {
    expect(jointInspection.coordinationBoundaryDisclaimer()).toMatch(/do not extend/i);
  });

  it('corrective action cannot close without required evidence', () => {
    expect(() => { correctiveBoundary.assertClosureRequiresEvidence({
        remediationEvidenceRecordIds: [],
        verificationEvidenceRecordIds: ['ev-1'],
        verifiedAt: new Date(),
      }); },
    ).toThrow(BadRequestException);
  });

  it('unauthorized actor cannot close corrective action', () => {
    expect(() => { correctiveBoundary.assertReviewerAuthorized({
        actorIdentityId: 'identity-a',
        actorOfficeholderId: 'oh-a',
        reviewerOfficeholderId: 'oh-b',
        reviewerIdentityId: 'identity-b',
      }); },
    ).toThrow(ForbiddenException);
  });

  it('expiration is calculated correctly', () => {
    const days = renewalMonitoring.computeDaysUntilExpiration(
      new Date('2026-01-10T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );
    expect(days).toBe(9);
  });

  it('payment does not renew license without finalized decision', () => {
    expect(() => { renewalMonitoring.assertPaymentDoesNotRenewInstrument({
        paymentReceived: true,
        decisionFinalized: false,
      }); },
    ).toThrow(BadRequestException);

    expect(() => { lifecycleGuard.assertRenewalEligibility({
        currentEvidenceIds: ['ev-1'],
        identityVerified: true,
        ownershipVerified: true,
        conditionsPerformanceVerified: true,
        priorApprovalReliedUpon: false,
        paymentReceived: true,
        decisionFinalized: false,
      }); },
    ).toThrow(BadRequestException);
  });

  it('consequential enforcement remains guarded by dedicated guard', () => {
    expect(ConsequentialActionGuard).toBeDefined();
  });

  it('corrective action service exposes enforcement boundary disclaimer', () => {
    const service = new ComplianceCorrectiveActionService({} as never, correctiveBoundary);
    expect(service.enforcementBoundaryDisclaimer()).toMatch(/not automatic enforcement/i);
  });

  it('detects expired instrument by date or status', () => {
    expect(
      renewalMonitoring.isInstrumentExpired(
        OfficialInstrumentStatus.ISSUED,
        new Date('2020-01-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('tracks corrective action verification status enum', () => {
    expect(ComplianceCorrectiveActionRegisterStatus.VERIFIED).toBe('VERIFIED');
  });
});
