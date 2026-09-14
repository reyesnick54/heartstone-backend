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
  }
}
