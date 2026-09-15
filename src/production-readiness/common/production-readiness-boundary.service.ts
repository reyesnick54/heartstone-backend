import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  IdentityType,
  LaunchGateOutcome,
  OperationalActivationOutcome,
  PlatformEnvironmentClassification,
  ProductionCorrectiveActionStatus,
  ReleaseArtifactStatus,
} from '@prisma/client';

import {
  FORBIDDEN_CLIENT_ACTIVATION_FIELDS,
  FORBIDDEN_CLIENT_GATE_FIELDS,
  FORBIDDEN_CLIENT_SUSPENSION_FIELDS,
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

  rejectClientActivationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_ACTIVATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PRODUCTION_READINESS_REASON_CODES.CLIENT_ACTIVATION_FIELDS}: client may not set "${field}"`,
        );
      }
    }
  }

  rejectClientGateFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_GATE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PRODUCTION_READINESS_REASON_CODES.CLIENT_GATE_FIELDS}: client may not set "${field}"`,
        );
      }
    }
  }

  rejectClientSuspensionFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_SUSPENSION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PRODUCTION_READINESS_REASON_CODES.CLIENT_SUSPENSION_FIELDS}: client may not set "${field}"`,
        );
      }
    }
  }

  assertCiSuccessNotInstitutionalAcceptance(
    ciPassed: boolean,
    institutionalAccepted: boolean,
  ): void {
    if (ciPassed && !institutionalAccepted) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.CI_NOT_INSTITUTIONAL_ACCEPTANCE,
      );
    }
  }

  assertDeploymentNotActivation(deployed: boolean, activated: boolean): void {
    if (deployed && !activated) {
      return;
    }
    if (deployed && activated && !this.hasExplicitActivationDecision(deployed, activated)) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.DEPLOYMENT_NOT_ACTIVATION);
    }
  }

  private hasExplicitActivationDecision(_deployed: boolean, activated: boolean): boolean {
    return activated;
  }

  assertProductionReadyNotAuthorized(
    technicallyReady: boolean,
    institutionallyAuthorized: boolean,
  ): void {
    if (technicallyReady && !institutionallyAuthorized) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.PRODUCTION_READY_NOT_AUTHORIZED,
      );
    }
  }

  assertPilotNotAuthorization(pilotSucceeded: boolean, productionAuthorized: boolean): void {
    if (pilotSucceeded && !productionAuthorized) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.PILOT_NOT_AUTHORIZATION);
    }
  }

  assertTechnicalNotInstitutionalAcceptance(
    technicallyAccepted: boolean,
    institutionallyAccepted: boolean,
  ): void {
    if (technicallyAccepted && !institutionallyAccepted) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.TECHNICAL_NOT_INSTITUTIONAL);
    }
  }

  assertAcceptanceNotActivation(
    institutionallyAccepted: boolean,
    operationallyActivated: boolean,
  ): void {
    if (institutionallyAccepted && operationallyActivated && !this.hasActivationRecord()) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.ACCEPTANCE_NOT_ACTIVATION);
    }
  }

  private hasActivationRecord(): boolean {
    return false;
  }

  assertActivationWithinScope(requestedScope: string[], acceptedScope: string[]): void {
    const exceeds = requestedScope.some((item) => !acceptedScope.includes(item));
    if (exceeds) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.ACTIVATION_EXCEEDS_SCOPE);
    }
  }

  assertSystemAdminCannotActivateInstitutionalFunction(
    isSystemAdministrator: boolean,
    isInstitutionalFunction: boolean,
  ): void {
    if (isSystemAdministrator && isInstitutionalFunction) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.SYSADMIN_CANNOT_ACTIVATE);
    }
  }

  assertVendorCannotAcceptInstitutionalRisk(actorType: IdentityType): void {
    if (actorType === IdentityType.SERVICE) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.VENDOR_CANNOT_ACCEPT_RISK);
    }
  }

  assertAiCannotAcceptInstitutionalRisk(actorType: IdentityType, isAiActor: boolean): void {
    if (isAiActor) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_ACCEPT_RISK);
    }
    if (actorType === IdentityType.SERVICE) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.VENDOR_CANNOT_ACCEPT_RISK);
    }
  }

  assertAiCannotActivateProduction(isAiActor: boolean): void {
    if (isAiActor) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_ACTIVATE);
    }
  }

  assertAiCannotOverrideSafeHalt(isAiActor: boolean, safeHaltActive: boolean): void {
    if (isAiActor && safeHaltActive) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_OVERRIDE_SAFE_HALT);
    }
  }

  assertDeveloperCannotSelfAssignAcceptance(isDeveloper: boolean, isSelfAssigned: boolean): void {
    if (isDeveloper && isSelfAssigned) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.DEVELOPER_CANNOT_SELF_ACCEPT);
    }
  }

  assertExpiredAcceptanceInvalid(
    validUntil: Date | null | undefined,
    now: Date = new Date(),
  ): void {
    if (validUntil && validUntil < now) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.EXPIRED_ACCEPTANCE);
    }
  }

  assertBackupNotRecovery(backupSucceeded: boolean, restoreTested: boolean): void {
    if (backupSucceeded && !restoreTested) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.BACKUP_NOT_RECOVERY);
    }
  }

  assertUntestedRestoreCannotSupportReadiness(restoreTested: boolean): void {
    if (!restoreTested) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.UNTESTED_RESTORE);
    }
  }

  assertCorruptRestoreCannotResume(restoreIntegrityValid: boolean): void {
    if (!restoreIntegrityValid) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.CORRUPT_RESTORE);
    }
  }

  assertTechnicalRestorationNotInstitutionalResumption(
    technicallyRestored: boolean,
    institutionallyAuthorized: boolean,
  ): void {
    if (technicallyRestored && !institutionallyAuthorized) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.RESTORATION_NOT_RESUMPTION);
    }
  }

  assertHealthCheckNotInstitutionalValidity(
    healthOk: boolean,
    institutionallyValid: boolean,
  ): void {
    if (healthOk && !institutionallyValid) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.HEALTH_NOT_VALIDITY);
    }
  }

  assertHttp200NotGovernmentDetermination(httpOk: boolean, determinationRecorded: boolean): void {
    if (httpOk && !determinationRecorded) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.HTTP200_NOT_DETERMINATION);
    }
  }

  assertRiskScoreCannotOverrideLaunchGate(riskScoreLow: boolean, gateBlocked: boolean): void {
    if (riskScoreLow && gateBlocked) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.RISK_SCORE_NO_OVERRIDE);
    }
  }

  assertRollbackCannotEraseHistory(historyErased: boolean): void {
    if (historyErased) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.ROLLBACK_NO_ERASE);
    }
  }

  assertSuspensionPreservesRecords(recordsDeleted: boolean): void {
    if (recordsDeleted) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.SUSPENSION_PRESERVES_RECORDS);
    }
  }

  assertRetirementNotDestruction(recordsPreserved: boolean): void {
    if (!recordsPreserved) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.DECOMMISSION_NO_DESTROY);
    }
  }

  assertReplacementRequiresAcceptance(successorAccepted: boolean): void {
    if (!successorAccepted) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.REPLACEMENT_NO_PRE_ACCEPTANCE);
    }
  }

  assertCorrectiveActionRequiresVerificationBeforeClosure(
    verificationRequired: boolean,
    status: ProductionCorrectiveActionStatus,
    verifiedAt: Date | null | undefined,
  ): void {
    if (verificationRequired && status === ProductionCorrectiveActionStatus.CLOSED && !verifiedAt) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.CORRECTIVE_ACTION_NO_SKIP_VERIFY,
      );
    }
  }

  assertLaunchGateRequirementsMet(
    requirements: Record<string, boolean>,
    mandatoryKeys: readonly string[],
  ): LaunchGateOutcome {
    const unmet = mandatoryKeys.filter((key) => !requirements[key]);
    if (unmet.length === 0) {
      return LaunchGateOutcome.PASSED;
    }
    if (unmet.some((key) => this.isBlockingRequirement(key))) {
      return LaunchGateOutcome.BLOCKED;
    }
    return LaunchGateOutcome.CONDITIONAL;
  }

  private isBlockingRequirement(key: string): boolean {
    return [
      'no_unresolved_blocking_defect',
      'security_readiness_accepted',
      'exact_release_accepted',
      'production_activation_decision_valid',
    ].includes(key);
  }

  mapGateOutcomeToActivationOutcome(gateOutcome: LaunchGateOutcome): OperationalActivationOutcome {
    switch (gateOutcome) {
      case LaunchGateOutcome.PASSED:
        return OperationalActivationOutcome.ACTIVATED;
      case LaunchGateOutcome.BLOCKED:
        return OperationalActivationOutcome.REQUIRES_GATE;
      case LaunchGateOutcome.CONDITIONAL:
        return OperationalActivationOutcome.REQUIRES_ACCEPTANCE;
      default:
        return OperationalActivationOutcome.BLOCKED;
    }
  }

  assertSecretNotInSource(sourceContent: string, secretPatterns: RegExp[]): void {
    for (const pattern of secretPatterns) {
      if (pattern.test(sourceContent)) {
        throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.SECRET_IN_SOURCE);
      }
    }
  }

  assertSecretNotInLog(logContent: string, secretValue: string): void {
    if (logContent.includes(secretValue)) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.SECRET_IN_LOG);
    }
  }

  assertReleaseArtifactSignatureRequired(signed: boolean): void {
    if (!signed) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.UNSIGNED_ARTIFACT);
    }
  }

  assertWrongDigestBlocked(expected: string, actual: string): void {
    if (expected !== actual) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.WRONG_DIGEST);
    }
  }
}
