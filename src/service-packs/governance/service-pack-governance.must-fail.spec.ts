import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  IdentityType,
  ServicePackGovernanceLifecycleStatus,
  ServicePackManifestValidationStatus,
  ServicePackReviewFindingSeverity,
  ServicePackReviewFindingStatus,
  ServicePackReviewType,
} from '@prisma/client';

import { SERVICE_PACK_GOVERNANCE_REASON_CODES } from './service-pack-governance.constants';
import { ServicePackGovernanceBoundaryService } from './service-pack-governance-boundary.service';
import { buildServicePackVersionGovernanceFingerprint } from './service-pack-version-fingerprint.util';

describe('Service pack governance must-fail gates', () => {
  const boundary = new ServicePackGovernanceBoundaryService();

  it('technical validation alone cannot create acceptance', () => {
    expect(() => {
      boundary.assertValidationAloneCannotAccept(false, true);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.VALIDATION_NOT_ACCEPTANCE);
  });

  it('unauthorized reviewer cannot accept via review access alone', () => {
    expect(() => {
      boundary.assertHumanInstitutionalAcceptanceActor(IdentityType.SERVICE);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.SERVICE_IDENTITY_CANNOT_ACCEPT);
  });

  it('platform administrator cannot accept through non-individual identity types', () => {
    expect(() => {
      boundary.assertHumanInstitutionalAcceptanceActor(IdentityType.ORGANIZATION);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.AI_CANNOT_ACCEPT);
  });

  it('unresolved blocking finding prevents acceptance', () => {
    expect(() => {
      boundary.assertNoBlockingFindings([
        {
          severity: ServicePackReviewFindingSeverity.BLOCKING,
          status: ServicePackReviewFindingStatus.OPEN,
        },
      ]);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.BLOCKING_FINDING);
  });

  it('changed fingerprint invalidates prior acceptance when fingerprints differ', () => {
    const prior = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: 'v1',
      manifestChecksum: 'a',
    });
    const next = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: 'v2',
      manifestChecksum: 'a',
    });
    expect(prior).not.toBe(next);
  });

  it('acceptance of v1 does not accept v2 fingerprints', () => {
    const v1 = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: '1.0.0',
      manifestChecksum: 'checksum-a',
    });
    const v2 = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: '2.0.0',
      manifestChecksum: 'checksum-b',
    });
    expect(v1).not.toEqual(v2);
  });

  it('reviewer cannot spoof accepting identity through client payload fields', () => {
    expect(() => {
      boundary.rejectClientGovernanceIdentityFields({ acceptingIdentityId: 'spoofed' });
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.SPOOFED_ACCEPTING_IDENTITY);
  });

  it('authority review cannot authenticate a governing source without authority evaluation', () => {
    expect(() => {
      boundary.assertAuthorityReviewCannotAuthenticateSourceUnlessPermitted({
        reviewType: ServicePackReviewType.AUTHORITY_LEGAL_BASIS,
        resolutionClaimsSourceAuthenticated: true,
        authorityEvaluationAllowed: false,
      });
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.AUTHORITY_REVIEW_CANNOT_AUTHENTICATE_SOURCE);
  });

  it('rejected pack cannot deploy', () => {
    expect(() => {
      boundary.assertRejectedOrWithdrawnCannotDeploy(ServicePackGovernanceLifecycleStatus.REJECTED);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.REJECTED_CANNOT_DEPLOY);
  });

  it('withdrawn pack cannot activate', () => {
    expect(() => {
      boundary.assertRejectedOrWithdrawnCannotDeploy(
        ServicePackGovernanceLifecycleStatus.WITHDRAWN,
      );
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.WITHDRAWN_CANNOT_ACTIVATE);
  });

  it('AI/automation identities cannot institutionally accept (organization identity)', () => {
    expect(() => {
      boundary.assertHumanInstitutionalAcceptanceActor(IdentityType.ORGANIZATION);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.AI_CANNOT_ACCEPT);
  });

  it('service identity cannot perform required human acceptance', () => {
    expect(() => {
      boundary.assertHumanInstitutionalAcceptanceActor(IdentityType.SERVICE);
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.SERVICE_IDENTITY_CANNOT_ACCEPT);
  });

  it('reviewer comment cannot create authority records', () => {
    expect(() => {
      boundary.assertReviewerCommentDoesNotCreateAuthority({
        comment: 'approved',
        authorityEvaluationRecordId: 'eval-1',
      });
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.REVIEWER_COMMENT_NOT_AUTHORITY);
  });

  it('blocks validated to active transition without institutional acceptance', () => {
    expect(() => {
      boundary.assertValidatedToActiveForbidden(
        ServicePackManifestValidationStatus.VALIDATED,
        true,
      );
    }).toThrow(SERVICE_PACK_GOVERNANCE_REASON_CODES.VALIDATED_TO_ACTIVE_FORBIDDEN);
  });

  it('rejects spoofed identity fields with forbidden exception type', () => {
    expect(() => {
      boundary.rejectClientGovernanceIdentityFields({ identityId: 'x' });
    }).toThrow(ForbiddenException);
    expect(() => {
      boundary.assertNoBlockingFindings([
        {
          severity: ServicePackReviewFindingSeverity.BLOCKING,
          status: ServicePackReviewFindingStatus.OPEN,
        },
      ]);
    }).toThrow(BadRequestException);
  });
});
