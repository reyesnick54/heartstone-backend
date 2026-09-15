import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { AcceptanceLevel, IdentityType } from '@prisma/client';

import { AI_ACTOR_IDENTITY_PREFIX } from '../../evidence/evidence.constants';
import {
  FORBIDDEN_ACCEPTANCE_BASIS_TYPES,
  FORBIDDEN_CLIENT_ACCEPTANCE_FIELDS,
  INSTITUTIONAL_ACCEPTANCE_LEVELS,
  TECHNICAL_ACCEPTANCE_LEVELS,
} from '../production-readiness.constants';

@Injectable()
export class ProductionReadinessBoundaryService {
  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_ACCEPTANCE_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(
          `Client may not set protected acceptance or activation field: ${field}`,
        );
      }
    }
  }

  assertAiCannotAcceptDossier(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot accept institutional acceptance dossiers');
    }
  }

  assertAiCannotAcceptResidualRisk(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot accept residual risks');
    }
  }

  assertAiCannotActivateProduction(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot activate production');
    }
  }

  assertHumanOfficeholderRequired(identityType: IdentityType): void {
    if (identityType === IdentityType.SERVICE) {
      throw new ForbiddenException(
        'Service identities cannot perform institutional acceptance or production activation',
      );
    }
  }

  assertDeveloperCannotInstitutionallyAcceptOwnDelivery(
    actorIdentityId: string,
    technicalImplementerIdentityId?: string | null,
  ): void {
    if (technicalImplementerIdentityId && actorIdentityId === technicalImplementerIdentityId) {
      throw new ForbiddenException(
        'Technical implementer cannot institutionally accept their own delivery',
      );
    }
  }

  assertForbiddenAcceptanceBasis(basisType?: string): void {
    if (!basisType) {
      return;
    }

    if (
      (FORBIDDEN_ACCEPTANCE_BASIS_TYPES as readonly string[]).includes(basisType)
    ) {
      throw new BadRequestException(
        `${basisType} cannot constitute institutional acceptance or production activation`,
      );
    }
  }

  assertTechnicalLevelDoesNotImplyInstitutional(level: AcceptanceLevel): void {
    if ((TECHNICAL_ACCEPTANCE_LEVELS as readonly string[]).includes(level)) {
      throw new BadRequestException(
        `Acceptance level ${level} is technical and does not imply institutional acceptance`,
      );
    }
  }

  assertInstitutionalAcceptanceDoesNotEqualActivation(level: AcceptanceLevel): void {
    if (level === AcceptanceLevel.INSTITUTIONAL) {
      throw new BadRequestException(
        'Institutional acceptance does not equal production activation; a separate activation decision is required',
      );
    }
  }

  assertInstitutionalLevelForFinalAcceptance(level: AcceptanceLevel): void {
    if (!(INSTITUTIONAL_ACCEPTANCE_LEVELS as readonly string[]).includes(level)) {
      throw new BadRequestException(
        `Final institutional acceptance requires level INSTITUTIONAL or OPERATIONAL_ACTIVATION, not ${level}`,
      );
    }
  }

  assertNotificationDoesNotCreateActivation(): void {
    // Documented invariant: communications are recorded separately and never mutate activation state.
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  DepartmentReadinessStatus,
  IdentityType,
  OperatorQualificationStatus,
  TrainingCompletionStatus,
} from '@prisma/client';

import {
  AI_ACTOR_IDENTITY_PREFIX,
  AI_ACTOR_ROLE_MARKER,
  AI_CANNOT_QUALIFY_OPERATOR_MESSAGE,
  ALTERNATE_CANNOT_ASSUME_OFFICE_MESSAGE,
  ATTENDANCE_NOT_COMPETENCE_MESSAGE,
  COURSE_COMPLETION_NOT_QUALIFICATION_MESSAGE,
  DEPARTMENT_CANNOT_SELF_ACTIVATE_MESSAGE,
  DEPARTMENT_READINESS_NOT_ACCEPTANCE_MESSAGE,
  FORBIDDEN_CLIENT_QUALIFICATION_FIELDS,
  FORBIDDEN_CLIENT_READINESS_FIELDS,
  FORBIDDEN_CLIENT_SUPPORT_FIELDS,
  PRODUCTION_READINESS_REASON_CODES,
  QUALIFIED_STATUSES,
  TRAINING_PROVIDER_SELF_AUTHORITY_MESSAGE,
} from '../production-readiness.constants';

export interface QualificationAccessInput {
  status: OperatorQualificationStatus;
  effectiveUntil?: Date | null;
  scope: string;
  requiredScope: string;
  isHighConsequence: boolean;
  isAiAssessed: boolean;
}

export interface TrainingGateInput {
  isHighConsequence: boolean;
  trainingExpired: boolean;
  professionalQualificationExpired: boolean;
}

export interface DepartmentReadinessInput {
  status: DepartmentReadinessStatus;
  isInstitutionalAcceptance: boolean;
  selfActivated: boolean;
  supportCoverageGapDetected: boolean;
  staffingShortageDetected: boolean;
  mandatoryControlOperable: boolean;
}

@Injectable()
export class ProductionReadinessBoundaryService {
  rejectClientProtectedFields(
    payload: Record<string, unknown>,
    forbiddenFields: readonly string[],
  ): void {
    for (const field of forbiddenFields) {
      if (field in payload) {
        throw new BadRequestException(`Client cannot set protected field: ${field}`);
      }
    }
  }

  rejectClientQualificationFields(payload: Record<string, unknown>): void {
    this.rejectClientProtectedFields(payload, FORBIDDEN_CLIENT_QUALIFICATION_FIELDS);
  }

  rejectClientReadinessFields(payload: Record<string, unknown>): void {
    this.rejectClientProtectedFields(payload, FORBIDDEN_CLIENT_READINESS_FIELDS);
  }

  rejectClientSupportFields(payload: Record<string, unknown>): void {
    this.rejectClientProtectedFields(payload, FORBIDDEN_CLIENT_SUPPORT_FIELDS);
  }

  assertAttendanceNotCompetence(isAttendanceOnly: boolean, proposedStatus?: OperatorQualificationStatus): void {
    if (!isAttendanceOnly) {
      return;
    }

    if (
      proposedStatus &&
      (QUALIFIED_STATUSES as readonly string[]).includes(proposedStatus)
    ) {
      throw new BadRequestException({
        code: PRODUCTION_READINESS_REASON_CODES.ATTENDANCE_NOT_COMPETENCE,
        message: ATTENDANCE_NOT_COMPETENCE_MESSAGE,
      });
    }

    throw new BadRequestException({
      code: PRODUCTION_READINESS_REASON_CODES.ATTENDANCE_NOT_COMPETENCE,
      message: ATTENDANCE_NOT_COMPETENCE_MESSAGE,
    });
  }

  assertCourseCompletionNotQualification(
    trainingStatus: TrainingCompletionStatus,
    proposedStatus: OperatorQualificationStatus,
    hasCompetencyAssessment: boolean,
    hasPracticalAssessment: boolean,
  ): void {
    if (trainingStatus !== TrainingCompletionStatus.COMPLETED) {
      return;
    }

    if (
      (QUALIFIED_STATUSES as readonly string[]).includes(proposedStatus) &&
      !hasCompetencyAssessment &&
      !hasPracticalAssessment
    ) {
      throw new BadRequestException({
        code: PRODUCTION_READINESS_REASON_CODES.COURSE_COMPLETION_NOT_QUALIFICATION,
        message: COURSE_COMPLETION_NOT_QUALIFICATION_MESSAGE,
      });
    }
  }

  assertSystemRoleNotAppointment(
    hasTechnicalRole: boolean,
    hasAppointment: boolean,
    appointmentRequired: boolean,
  ): void {
    if (appointmentRequired && hasTechnicalRole && !hasAppointment) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.SYSTEM_ROLE_NOT_APPOINTMENT,
        message: 'Technical system role cannot replace appointment for production access',
      });
    }
  }

  assertTechnicalPermissionNotAuthority(hasTechnicalPermission: boolean, hasAuthority: boolean): void {
    if (hasTechnicalPermission && !hasAuthority) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.TECHNICAL_PERMISSION_NOT_AUTHORITY,
        message: 'Technical permission does not create legal or institutional authority',
      });
    }
  }

  assertAiCannotQualifyOperator(isAiActor: boolean, identityType?: IdentityType, roleMarker?: string): void {
    if (
      isAiActor ||
      identityType === IdentityType.SERVICE ||
      roleMarker === AI_ACTOR_ROLE_MARKER
    ) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_QUALIFY_OPERATOR,
        message: AI_CANNOT_QUALIFY_OPERATOR_MESSAGE,
      });
    }
  }

  assertAiIdentityCannotQualify(displayName: string): void {
    if (displayName.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_QUALIFY_OPERATOR,
        message: AI_CANNOT_QUALIFY_OPERATOR_MESSAGE,
      });
    }
  }

  assertTrainingProviderCannotSelfAssignAuthority(
    providerReference: string | null | undefined,
    isGovernmentAuthority: boolean,
    assessorIsProvider: boolean,
  ): void {
    if (isGovernmentAuthority) {
      return;
    }

    if (assessorIsProvider && providerReference) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.TRAINING_PROVIDER_CANNOT_SELF_ASSIGN_AUTHORITY,
        message: TRAINING_PROVIDER_SELF_AUTHORITY_MESSAGE,
      });
    }
  }

  assertAlternateCannotAssumeOffice(
    isAlternate: boolean,
    hasValidAppointment: boolean,
    hasValidDelegation: boolean,
    appointmentRequired: boolean,
    delegationRequired: boolean,
  ): void {
    if (!isAlternate) {
      return;
    }

    const appointmentMet = !appointmentRequired || hasValidAppointment;
    const delegationMet = !delegationRequired || hasValidDelegation;

    if (!appointmentMet || !delegationMet) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.ALTERNATE_CANNOT_ASSUME_OFFICE,
        message: ALTERNATE_CANNOT_ASSUME_OFFICE_MESSAGE,
      });
    }
  }

  assertDepartmentReadinessNotInstitutionalAcceptance(isInstitutionalAcceptance: boolean): void {
    if (isInstitutionalAcceptance) {
      throw new BadRequestException({
        code: PRODUCTION_READINESS_REASON_CODES.DEPARTMENT_READINESS_NOT_INSTITUTIONAL_ACCEPTANCE,
        message: DEPARTMENT_READINESS_NOT_ACCEPTANCE_MESSAGE,
      });
    }
  }

  assertDepartmentCannotSelfActivate(selfActivated: boolean): void {
    if (selfActivated) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.DEPARTMENT_CANNOT_SELF_ACTIVATE,
        message: DEPARTMENT_CANNOT_SELF_ACTIVATE_MESSAGE,
      });
    }
  }

  assertQualificationScopeEnforced(scope: string, requiredScope: string): void {
    if (scope !== requiredScope) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.QUALIFICATION_SCOPE_MISMATCH,
        message: `Operator qualification scope "${scope}" does not match required scope "${requiredScope}"`,
      });
    }
  }

  assertHighConsequenceAccessAllowed(input: QualificationAccessInput): void {
    if (!input.isHighConsequence) {
      return;
    }

    if (input.isAiAssessed) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_QUALIFY_OPERATOR,
        message: AI_CANNOT_QUALIFY_OPERATOR_MESSAGE,
      });
    }

    if (
      input.status === OperatorQualificationStatus.SUSPENDED ||
      input.status === OperatorQualificationStatus.EXPIRED ||
      input.status === OperatorQualificationStatus.WITHDRAWN ||
      input.status === OperatorQualificationStatus.NOT_QUALIFIED
    ) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.HIGH_CONSEQUENCE_ACCESS_DENIED,
        message: `High-consequence function access denied for qualification status ${input.status}`,
      });
    }

    if (
      input.effectiveUntil &&
      input.effectiveUntil.getTime() < Date.now()
    ) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.QUALIFICATION_EXPIRED,
        message: 'Qualification has expired; high-consequence access denied',
      });
    }

    this.assertQualificationScopeEnforced(input.scope, input.requiredScope);
  }

  assertTrainingGateForHighConsequence(input: TrainingGateInput): void {
    if (!input.isHighConsequence) {
      return;
    }

    if (input.trainingExpired) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.HIGH_CONSEQUENCE_ACCESS_DENIED,
        message: 'Expired training blocks configured high-consequence function access',
      });
    }

    if (input.professionalQualificationExpired) {
      throw new ForbiddenException({
        code: PRODUCTION_READINESS_REASON_CODES.PROFESSIONAL_QUALIFICATION_EXPIRED,
        message: 'Expired professional qualification blocks reserved activity',
      });
    }
  }

  assertStaffingShortageBlocksReadiness(
    shortageBlocksReadiness: boolean,
    mandatoryControlOperable: boolean,
  ): void {
    if (shortageBlocksReadiness && !mandatoryControlOperable) {
      throw new BadRequestException({
        code: PRODUCTION_READINESS_REASON_CODES.STAFFING_SHORTAGE_BLOCKS_READINESS,
        message: 'Staffing shortage prevents readiness when mandatory control cannot operate',
      });
    }
  }

  assertSupportCoverageGapVisible(supportCoverageGapDetected: boolean): boolean {
    return supportCoverageGapDetected;
  }

  assertNamedOwnerNotCoverage(isNamedOwner: boolean, isOperationalCoverage: boolean): void {
    if (isNamedOwner && !isOperationalCoverage) {
      throw new BadRequestException({
        code: PRODUCTION_READINESS_REASON_CODES.NAMED_OWNER_NOT_COVERAGE,
        message: 'Named owner designation does not establish operational coverage',
      });
    }
  }

  deriveReadinessStatusFromGaps(input: DepartmentReadinessInput): DepartmentReadinessStatus {
    if (input.staffingShortageDetected && !input.mandatoryControlOperable) {
      return DepartmentReadinessStatus.NOT_READY;
    }

    if (input.supportCoverageGapDetected) {
      return DepartmentReadinessStatus.PARTIALLY_READY;
    }

    return input.status;
import { PlatformEnvironmentClassification, ReleaseArtifactStatus } from '@prisma/client';

import {
  NON_PRODUCTION_CLASSIFICATIONS,
  PRODUCTION_CAPABLE_CLASSIFICATIONS,
import {
  IdentityType,
  LaunchGateOutcome,
  OperationalActivationOutcome,
  ProductionCorrectiveActionStatus,
} from '@prisma/client';

import {
  FORBIDDEN_CLIENT_ACTIVATION_FIELDS,
  FORBIDDEN_CLIENT_GATE_FIELDS,
  FORBIDDEN_CLIENT_SUSPENSION_FIELDS,
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

  assertUnsignedArtifactBlocked(signed: boolean): void {
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
