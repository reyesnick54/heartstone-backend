import { ForbiddenException } from '@nestjs/common';
import { ServicePackDeploymentStatus, ServicePackVersionStatus } from '@prisma/client';

import { ServicePacksBoundaryService } from './common/service-packs-boundary.service';
import { SERVICE_PACK_REASON_CODES } from './service-packs.constants';

describe('Service pack must-fail gates', () => {
  const boundary = new ServicePacksBoundaryService();

  it('rejects client PATCH of governed version status fields', () => {
    expect(() => {
      boundary.rejectClientProtectedVersionFields({ status: ServicePackVersionStatus.ACCEPTED });
    }).toThrow(ForbiddenException);
  });

  it('rejects modification of accepted immutable versions', () => {
    expect(() => {
      boundary.assertAcceptedVersionImmutable(true, ServicePackVersionStatus.ACCEPTED);
    }).toThrow(SERVICE_PACK_REASON_CODES.ACCEPTED_VERSION_IMMUTABLE);
  });

  it('requires a new version for post-acceptance modifications', () => {
    expect(() => {
      boundary.assertNewVersionRequiredForModification(ServicePackVersionStatus.ACCEPTED);
    }).toThrow(SERVICE_PACK_REASON_CODES.NEW_VERSION_REQUIRED);
  });

  it('blocks validation pathways from activating services', () => {
    expect(() => {
      boundary.assertValidationDoesNotActivateServices(ServicePackDeploymentStatus.ACTIVE);
    }).toThrow(SERVICE_PACK_REASON_CODES.VALIDATION_NOT_ACTIVATION);
    expect(() => {
      boundary.assertValidationDoesNotActivateServices(ServicePackDeploymentStatus.DEPLOYED);
    }).toThrow(SERVICE_PACK_REASON_CODES.VALIDATION_NOT_ACTIVATION);
  });

  it('blocks validation pathways from creating government decisions', () => {
    expect(() => {
      boundary.assertValidationDoesNotCreateDecisions({ governmentDecisionId: 'decision-1' });
    }).toThrow(SERVICE_PACK_REASON_CODES.VALIDATION_NOT_DECISION);
  });

  it('blocks manifest authority auto-valid declarations', () => {
    expect(() => {
      boundary.assertManifestAuthorityNotAutoValid({ automaticallyValid: true });
    }).toThrow(SERVICE_PACK_REASON_CODES.AUTHORITY_AUTO_VALID_FORBIDDEN);
  });

  it('blocks external dependencies falsely marked HeartStone-controlled', () => {
    expect(() => {
      boundary.assertExternalDependencyNotFalselyControlled({
        dependencyKind: 'PAYMENT_PROVIDER',
        controlScope: 'HEARTSTONE_CONTROLLED',
      });
    }).toThrow(SERVICE_PACK_REASON_CODES.EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED);
  });
});
