import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PlatformEnvironmentClassification, ReleaseArtifactStatus } from '@prisma/client';

import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';

describe('Phase 13E must-fail gates', () => {
  let boundary: ProductionReadinessBoundaryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductionReadinessBoundaryService],
    }).compile();
    boundary = module.get(ProductionReadinessBoundaryService);
  });

  it('blocks production semantics via NODE_ENV spoofing in test', () => {
    expect(() => {
      boundary.assertNoProductionSemanticsViaSpoofing(
        PlatformEnvironmentClassification.TEST,
        'production',
      );
    }).toThrow(ForbiddenException);
  });

  it('blocks CI green from authorizing production', () => {
    expect(() => {
      boundary.assertCiGreenDoesNotAuthorizeProduction(true);
    }).toThrow(ForbiddenException);
  });

  it('blocks unsigned artifact deployment', () => {
    expect(() => {
      boundary.assertUnsignedArtifactBlocked(ReleaseArtifactStatus.PENDING);
    }).toThrow(ForbiddenException);
  });

  it('blocks unaccepted artifact deployment', () => {
    expect(() => {
      boundary.assertUnacceptedArtifactBlocked(ReleaseArtifactStatus.BUILT);
    }).toThrow(ForbiddenException);
  });

  it('blocks artifact digest mismatch', () => {
    expect(() => {
      boundary.assertArtifactDigestMatches('abc', 'def');
    }).toThrow(ForbiddenException);
  });

  it('blocks production deploy without explicit approval', () => {
    expect(() => {
      boundary.assertProductionDeployRequiresExplicitApproval(
        PlatformEnvironmentClassification.PRODUCTION,
        false,
      );
    }).toThrow(ForbiddenException);
  });

  it('blocks production credential in non-production environment', () => {
    expect(() => {
      boundary.assertProductionCredentialNotInNonProduction(
        true,
        PlatformEnvironmentClassification.DEVELOPMENT,
      );
    }).toThrow(ForbiddenException);
  });

  it('blocks live government endpoint in test by default', () => {
    expect(() => {
      boundary.assertLiveGovernmentEndpointNotCallableByDefault(
        true,
        PlatformEnvironmentClassification.TEST,
      );
    }).toThrow(ForbiddenException);
  });

  it('blocks production data transfer without approval', () => {
    expect(() => {
      boundary.assertProductionDataTransferApproved(false);
    }).toThrow(ForbiddenException);
  });

  it('blocks feature use when only deployed not institutionally activated', () => {
    expect(() => {
      boundary.assertDeploymentNotEqualToFeatureActivation(true, false, 'use');
    }).toThrow(ForbiddenException);
  });

  it('blocks emergency change altering institutional authority', () => {
    expect(() => {
      boundary.assertEmergencyChangeCannotAlterAuthority(true);
    }).toThrow(ForbiddenException);
  });

  it('blocks rollback that does not preserve official records', () => {
    expect(() => {
      boundary.assertRollbackPreservesOfficialRecords(false);
    }).toThrow(ForbiddenException);
  });

  it('blocks immutable artifact modification', () => {
    expect(() => {
      boundary.assertImmutableArtifactNotModified(true, true);
    }).toThrow(ForbiddenException);
  });

  it('blocks change bypassing Phase 4 authority evaluation', () => {
    expect(() => {
      boundary.assertChangeCannotBypassAuthority(true, false);
    }).toThrow(ForbiddenException);
  });
});
