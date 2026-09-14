import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PlatformEnvironmentClassification, ReleaseArtifactStatus } from '@prisma/client';

import {
  NON_PRODUCTION_CLASSIFICATIONS,
  PRODUCTION_CAPABLE_CLASSIFICATIONS,
  PRODUCTION_READINESS_REASON_CODES,
} from '../production-readiness.constants';

@Injectable()
export class ProductionReadinessBoundaryService {
  assertNoProductionSemanticsViaSpoofing(
    declaredClassification: PlatformEnvironmentClassification,
    runtimeNodeEnv: string,
    runtimeEnvClassification?: string,
  ): void {
    const isNonProduction = NON_PRODUCTION_CLASSIFICATIONS.includes(declaredClassification);

    if (
      isNonProduction &&
      (runtimeNodeEnv === 'production' ||
        runtimeEnvClassification === PlatformEnvironmentClassification.PRODUCTION)
    ) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.PRODUCTION_SEMANTICS_SPOOFING_FORBIDDEN,
      );
    }
  }

  assertCiGreenDoesNotAuthorizeProduction(ciAuthorizesProduction: boolean): void {
    if (ciAuthorizesProduction) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.CI_GREEN_NOT_PRODUCTION_AUTHORIZATION,
      );
    }
  }

  assertUnsignedArtifactBlocked(artifactStatus: ReleaseArtifactStatus): void {
    if (artifactStatus === ReleaseArtifactStatus.PENDING) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.UNSIGNED_ARTIFACT_BLOCKED);
    }
  }

  assertUnbuiltArtifactCannotBeAccepted(artifactStatus: ReleaseArtifactStatus): void {
    if (artifactStatus !== ReleaseArtifactStatus.BUILT) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.UNSIGNED_ARTIFACT_BLOCKED);
    }
  }

  assertUnacceptedArtifactBlocked(artifactStatus: ReleaseArtifactStatus): void {
    if (artifactStatus !== ReleaseArtifactStatus.ACCEPTED) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.UNACCEPTED_ARTIFACT_BLOCKED);
    }
  }

  assertArtifactDigestMatches(expectedDigest: string, actualDigest: string): void {
    if (expectedDigest !== actualDigest) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.ARTIFACT_DIGEST_MISMATCH);
    }
  }

  assertProductionDeployRequiresExplicitApproval(
    classification: PlatformEnvironmentClassification,
    hasApprovedRelease: boolean,
  ): void {
    if (PRODUCTION_CAPABLE_CLASSIFICATIONS.includes(classification) && !hasApprovedRelease) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.PRODUCTION_DEPLOY_REQUIRES_APPROVAL,
      );
    }
  }

  assertProductionCredentialNotInNonProduction(
    isProductionCredential: boolean,
    classification: PlatformEnvironmentClassification,
  ): void {
    if (isProductionCredential && NON_PRODUCTION_CLASSIFICATIONS.includes(classification)) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.PRODUCTION_CREDENTIAL_IN_NON_PRODUCTION,
      );
    }
  }

  assertLiveGovernmentEndpointNotCallableByDefault(
    isLiveGovernmentEndpoint: boolean,
    classification: PlatformEnvironmentClassification,
  ): void {
    if (isLiveGovernmentEndpoint && NON_PRODUCTION_CLASSIFICATIONS.includes(classification)) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.LIVE_GOVERNMENT_ENDPOINT_IN_TEST,
      );
    }
  }

  assertProductionDataTransferApproved(isApproved: boolean): void {
    if (!isApproved) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.PRODUCTION_DATA_TRANSFER_UNAPPROVED,
      );
    }
  }

  assertDeploymentNotEqualToFeatureActivation(
    deploymentCompleted: boolean,
    institutionallyActivated: boolean,
    operation: 'activate' | 'use',
  ): void {
    if (operation === 'activate' && deploymentCompleted && !institutionallyActivated) {
      return;
    }

    if (operation === 'use' && deploymentCompleted && !institutionallyActivated) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.DEPLOYMENT_NOT_FEATURE_ACTIVATION,
      );
    }
  }

  assertEmergencyChangeCannotAlterAuthority(attemptsAuthorityAlteration: boolean): void {
    if (attemptsAuthorityAlteration) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.EMERGENCY_CHANGE_AUTHORITY_FORBIDDEN,
      );
    }
  }

  assertRollbackPreservesOfficialRecords(preservesOfficialRecords: boolean): void {
    if (!preservesOfficialRecords) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.ROLLBACK_MUST_PRESERVE_RECORDS,
      );
    }
  }

  assertImmutableArtifactNotModified(isImmutable: boolean, mutationRequested: boolean): void {
    if (isImmutable && mutationRequested) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.IMMUTABLE_ARTIFACT_MODIFICATION,
      );
    }
  }

  assertChangeCannotBypassAuthority(
    authorityImpactDeclared: boolean,
    authorityEvaluated: boolean,
  ): void {
    if (authorityImpactDeclared && !authorityEvaluated) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.CHANGE_BYPASS_AUTHORITY_FORBIDDEN,
      );
    }
  }

  assertMaterialChangeTriggersRevalidation(
    isMaterial: boolean,
    revalidationTriggered: boolean,
  ): void {
    if (isMaterial && !revalidationTriggered) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.MATERIAL_CHANGE_REVALIDATION_REQUIRED,
      );
    }
  }

  assertEmergencyChangeNotExpired(retrospectiveDeadline: Date, status: string): void {
    if (status === 'ACTIVE' && retrospectiveDeadline.getTime() < Date.now()) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_CHANGE_EXPIRED);
    }
  }
}
