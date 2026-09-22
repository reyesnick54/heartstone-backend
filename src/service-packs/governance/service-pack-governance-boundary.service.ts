import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  IdentityType,
  ServicePackGovernanceLifecycleStatus,
  ServicePackManifestValidationStatus,
  ServicePackReviewFindingSeverity,
  ServicePackReviewFindingStatus,
  ServicePackReviewType,
  ServicePackVersionStatus,
} from '@prisma/client';

import {
  BLOCKING_FINDING_SEVERITIES,
  FORBIDDEN_CLIENT_GOVERNANCE_FIELDS,
  SERVICE_PACK_GOVERNANCE_REASON_CODES,
} from './service-pack-governance.constants';

@Injectable()
export class ServicePackGovernanceBoundaryService {
  rejectClientGovernanceIdentityFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_GOVERNANCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(SERVICE_PACK_GOVERNANCE_REASON_CODES.SPOOFED_ACCEPTING_IDENTITY);
      }
    }
  }

  assertValidationAloneCannotAccept(
    hasGovernanceAcceptanceRecord: boolean,
    onlyValidated: boolean,
  ): void {
    if (onlyValidated && !hasGovernanceAcceptanceRecord) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.VALIDATION_NOT_ACCEPTANCE);
    }
  }

  assertValidatedToActiveForbidden(
    fromValidationStatus: ServicePackManifestValidationStatus,
    targetOperationalActivation: boolean,
  ): void {
    if (
      targetOperationalActivation &&
      fromValidationStatus === ServicePackManifestValidationStatus.VALIDATED
    ) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.VALIDATED_TO_ACTIVE_FORBIDDEN);
    }
  }

  assertHumanInstitutionalAcceptanceActor(identityType: IdentityType): void {
    if (identityType === IdentityType.SERVICE) {
      throw new ForbiddenException(SERVICE_PACK_GOVERNANCE_REASON_CODES.SERVICE_IDENTITY_CANNOT_ACCEPT);
    }
    if (identityType === IdentityType.ORGANIZATION) {
      throw new ForbiddenException(SERVICE_PACK_GOVERNANCE_REASON_CODES.AI_CANNOT_ACCEPT);
    }
  }

  assertNoBlockingFindings(
    findings: { severity: ServicePackReviewFindingSeverity; status: ServicePackReviewFindingStatus }[],
  ): void {
    const blocking = findings.filter(
      (finding) =>
        BLOCKING_FINDING_SEVERITIES.includes(
          finding.severity as (typeof BLOCKING_FINDING_SEVERITIES)[number],
        ) &&
        finding.status !== ServicePackReviewFindingStatus.RESOLVED &&
        finding.status !== ServicePackReviewFindingStatus.DISMISSED &&
        finding.status !== ServicePackReviewFindingStatus.ACCEPTED_RISK,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.BLOCKING_FINDING);
    }
  }

  assertRejectedOrWithdrawnCannotDeploy(
    governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus,
  ): void {
    if (governanceLifecycleStatus === ServicePackGovernanceLifecycleStatus.REJECTED) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.REJECTED_CANNOT_DEPLOY);
    }
    if (governanceLifecycleStatus === ServicePackGovernanceLifecycleStatus.WITHDRAWN) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.WITHDRAWN_CANNOT_ACTIVATE);
    }
  }

  assertAuthorityReviewCannotAuthenticateSourceUnlessPermitted(input: {
    reviewType: ServicePackReviewType;
    resolutionClaimsSourceAuthenticated: boolean;
    authorityEvaluationAllowed: boolean;
  }): void {
    if (
      input.reviewType === ServicePackReviewType.AUTHORITY_LEGAL_BASIS &&
      input.resolutionClaimsSourceAuthenticated &&
      !input.authorityEvaluationAllowed
    ) {
      throw new ForbiddenException(
        SERVICE_PACK_GOVERNANCE_REASON_CODES.AUTHORITY_REVIEW_CANNOT_AUTHENTICATE_SOURCE,
      );
    }
  }

  assertReviewerCommentDoesNotCreateAuthority(payload: Record<string, unknown>): void {
    const forbidden = [
      'authorityEvaluationRecordId',
      'governingSourceAuthenticated',
      'automaticallyValid',
      'authorityValid',
      'createAuthority',
    ];
    for (const field of forbidden) {
      if (field in payload && payload[field] !== undefined) {
        throw new BadRequestException(
          SERVICE_PACK_GOVERNANCE_REASON_CODES.REVIEWER_COMMENT_NOT_AUTHORITY,
        );
      }
    }
  }

  assertVersionCompiledForGovernance(status: ServicePackVersionStatus): void {
    if (status !== ServicePackVersionStatus.COMPILED) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.PRIOR_ACCEPTANCE_INVALID);
    }
  }
}
