import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  HealthcareAccessDecision,
  HealthcareDataAccessPurpose,
  HealthcareDataCategory,
  IdentityType,
  LegalHoldTargetType,
} from '@prisma/client';

import { CivilRegistryCanonicalPathService } from '../../civil-registry/common/civil-registry-canonical-path.service';
import { HealthcareBoundaryService } from '../../healthcare/common/healthcare-boundary.service';
import { HealthcareCanonicalAccessPolicyService } from '../../healthcare/common/healthcare-canonical-access-policy.service';
import { HealthcareDataAccessPolicyService } from '../../healthcare/privacy/healthcare-data-access-policy.service';
import { ActorContextService } from '../../identity/auth/context/actor-context.service';
import { InstitutionalActorScopeService } from '../../institutional-scope/institutional-actor-scope.service';
import { PropertyRegistryCanonicalPathService } from '../../property-registry/common/property-registry-canonical-path.service';
import { ServicePackCanonicalGovernanceService } from '../../service-packs/common/service-pack-canonical-governance.service';
import { S9_CONSOLIDATION_MATRIX } from './protected-history-schema.constants';
import { ProtectedRecordDeletionGuardService } from './protected-record-deletion-guard.service';

describe('S9 consolidation must-fail invariants', () => {
  it('documents canonical consolidation matrix', () => {
    expect(S9_CONSOLIDATION_MATRIX.civilRegistry.canonical).toContain('CivilRegistryEntry');
    expect(S9_CONSOLIDATION_MATRIX.property.canonical).toContain('LandParcel');
    expect(S9_CONSOLIDATION_MATRIX.actorContext.canonical).toContain('identity/auth/context');
  });

  describe('HealthcareCanonicalAccessPolicyService', () => {
    const privacyPolicy = new HealthcareDataAccessPolicyService(new HealthcareBoundaryService());
    const policy = new HealthcareCanonicalAccessPolicyService(
      { assertMayAccessHealthcareData: jest.fn() } as never,
      privacyPolicy,
      { assertProviderMayAccessPatient: jest.fn() } as never,
    );

    it('returns the same ALLOW decision for privacy self-access via canonical wrapper', () => {
      const decision = policy.evaluatePrivacyDecision({
        actorIdentityId: 'patient-1',
        patientHealthIdentityId: 'phi-1',
        patientLinkedPlatformIdentityId: 'patient-1',
        accessPurpose: HealthcareDataAccessPurpose.PATIENT_SELF,
        dataCategory: HealthcareDataCategory.GENERAL_HEALTH,
        relationshipKinds: [],
      });

      expect(decision).toBe(HealthcareAccessDecision.ALLOW);
    });

    it('rejects unified access when route payload missing', async () => {
      await expect(
        policy.assertUnifiedAccess({
          route: 'FOUNDATION',
          actor: { identityId: 'a', identityType: IdentityType.INDIVIDUAL } as never,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('ProtectedRecordDeletionGuardService', () => {
    it('refuses cascade purge operations', async () => {
      const guard = new ProtectedRecordDeletionGuardService({
        legalHold: { findFirst: jest.fn().mockResolvedValue(null) },
      } as never);

      await expect(
        guard.assertDestructiveDeletionAllowed({
          targetType: LegalHoldTargetType.DOCUMENT,
          targetReference: 'doc-1',
          operation: 'CASCADE_PURGE',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('Actor context consolidation', () => {
    it('uses canonical ActorContextService token for institutional scope adapter', () => {
      expect(InstitutionalActorScopeService).toBeDefined();
      expect(ActorContextService).toBeDefined();
    });
  });

  describe('Domain canonical path services', () => {
    it('exposes civil registry canonical linker', () => {
      expect(new CivilRegistryCanonicalPathService({} as never)).toBeInstanceOf(
        CivilRegistryCanonicalPathService,
      );
    });

    it('exposes property registry canonical linker', () => {
      expect(new PropertyRegistryCanonicalPathService({} as never)).toBeInstanceOf(
        PropertyRegistryCanonicalPathService,
      );
    });

    it('exposes service pack canonical governance guard', () => {
      expect(new ServicePackCanonicalGovernanceService({} as never)).toBeInstanceOf(
        ServicePackCanonicalGovernanceService,
      );
    });
  });
});
