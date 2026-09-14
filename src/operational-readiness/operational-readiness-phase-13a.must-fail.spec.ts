import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CapabilityDependencyControlScope,
  CapabilityMaturityState,
  ProductionReadinessStatus,
} from '@prisma/client';

import { isValidMaturityAdvancement } from './common/maturity-transition.util';
import { OperationalReadinessBoundaryService } from './common/operational-readiness-boundary.service';
import {
  AI_ACTOR_IDENTITY_PREFIX,
  AI_ACTOR_ROLE_MARKER,
  OPERATIONAL_READINESS_REASON_CODES,
} from './operational-readiness.constants';

describe('Phase 13A must-fail gates', () => {
  const boundary = new OperationalReadinessBoundaryService();

  describe('OperationalReadinessBoundaryService', () => {
    it('rejects client PATCH of maturity state', () => {
      expect(() => {
        boundary.rejectClientProtectedMaturityFields({ currentMaturityState: 'PRODUCTION_READY' });
      }).toThrow(ForbiddenException);
    });

    it('rejects technical completion as production-ready evidence', () => {
      expect(() => {
        boundary.assertTechnicalCompletionCannotAuthorizeProduction(['CI_PIPELINE_SUCCESS', 'BUILD_SUCCESS']);
      }).toThrow(BadRequestException);
      expect(() => {
        boundary.assertTechnicalCompletionCannotAuthorizeProduction(['CI_PIPELINE_SUCCESS', 'BUILD_SUCCESS']);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.TECHNICAL_COMPLETION_NOT_PRODUCTION_READY);
    });

    it('rejects production readiness alone as institutional acceptance', () => {
      expect(() => {
        boundary.assertProductionReadinessCannotSetInstitutionalAcceptance(
          CapabilityMaturityState.INSTITUTIONALLY_ACCEPTED,
          ['PRODUCTION_READINESS_ASSESSMENT'],
        );
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.PRODUCTION_READINESS_NOT_INSTITUTIONAL_ACCEPTANCE);
    });

    it('rejects institutional acceptance without mandatory activation conditions', () => {
      expect(() => {
        boundary.assertInstitutionalAcceptanceCannotAutoActivate(
          CapabilityMaturityState.OPERATIONALLY_ACTIVATED,
          false,
        );
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.INSTITUTIONAL_ACCEPTANCE_NOT_OPERATIONAL_ACTIVATION);
    });

    it('rejects pilot success as production authorization', () => {
      expect(() => {
        boundary.assertPilotSuccessCannotAuthorizeProduction(CapabilityMaturityState.PRODUCTION_READY, [
          'PILOT_SUCCESS',
        ]);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.PILOT_SUCCESS_NOT_PRODUCTION_AUTHORIZATION);
    });

    it('rejects GitHub CI success as institutional acceptance', () => {
      expect(() => {
        boundary.assertCiSuccessNotInstitutionalAcceptance(['CI_PIPELINE_SUCCESS']);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.CI_SUCCESS_NOT_INSTITUTIONAL_ACCEPTANCE);
    });

    it('rejects vendor certification as institutional acceptance', () => {
      expect(() => {
        boundary.assertVendorCertificationNotInstitutionalAcceptance(['VENDOR_CERTIFICATION']);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.VENDOR_CERT_NOT_INSTITUTIONAL_ACCEPTANCE);
    });

    it('blocks advancement with unresolved critical conditions', () => {
      expect(() => {
        boundary.assertUnresolvedCriticalConditionsBlock(true);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.UNRESOLVED_CRITICAL_CONDITION);
    });

    it('blocks external dependency falsely marked ready under HeartStone control', () => {
      expect(() => {
        boundary.assertExternalDependencyNotFalselyControlled({
          controlScope: CapabilityDependencyControlScope.EXTERNAL,
          isReady: true,
          verificationStatus: 'NOT_VERIFIED',
        });
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED);
    });

    it('blocks technical administrator from accepting institutional residual risk', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotAcceptInstitutionalRisk(true, true);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.TECH_ADMIN_CANNOT_ACCEPT_INSTITUTIONAL_RISK);
    });

    it('blocks AI from advancing maturity', () => {
      expect(() => {
        boundary.assertAiActorCannotAct(AI_ACTOR_ROLE_MARKER, `${AI_ACTOR_IDENTITY_PREFIX}reviewer`);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.AI_CANNOT_ADVANCE_MATURITY);
    });

    it('blocks suspended capability from appearing operational', () => {
      expect(() => {
        boundary.assertSuspendedCannotAppearOperational(true, CapabilityMaturityState.OPERATIONALLY_ACTIVATED);
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.SUSPENDED_CANNOT_APPEAR_OPERATIONAL);
    });

    it('blocks retired capability reactivation without replacement', () => {
      expect(() => {
        boundary.assertRetiredCannotReactivateWithoutReplacement(
          true,
          CapabilityMaturityState.OPERATIONALLY_ACTIVATED,
          false,
        );
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.RETIRED_CANNOT_REACTIVATE);
    });

    it('requires measurable conditions for READY_WITH_CONDITIONS', () => {
      expect(() => {
        boundary.assertReadyWithConditionsHasMeasurableConditions(
          ProductionReadinessStatus.READY_WITH_CONDITIONS,
          [],
        );
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.READY_WITH_CONDITIONS_REQUIRES_MEASURABLE);
    });

    it('rejects generic production activation endpoint paths', () => {
      expect(() => {
        boundary.assertNoProductionActivationEndpoint('/activate-production');
      }).toThrow(OPERATIONAL_READINESS_REASON_CODES.ACTIVATION_NOT_PRODUCTION);
    });
  });

  describe('Maturity transition rules', () => {
    it('forbids arbitrary maturity skipping', () => {
      expect(
        isValidMaturityAdvancement(CapabilityMaturityState.CONCEPTUAL, CapabilityMaturityState.PRODUCTION_READY),
      ).toBe(false);
    });

    it('allows single-step advancement along the canonical path', () => {
      expect(
        isValidMaturityAdvancement(CapabilityMaturityState.CONCEPTUAL, CapabilityMaturityState.DESIGNED),
      ).toBe(true);
    });

    it('allows revalidation pathway from active states', () => {
      expect(
        isValidMaturityAdvancement(
          CapabilityMaturityState.PRODUCTION_READY,
          CapabilityMaturityState.REVALIDATION_REQUIRED,
        ),
      ).toBe(true);
    });
  });
});
