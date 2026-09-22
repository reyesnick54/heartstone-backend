import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { HealthcareLicenseStatus } from '@prisma/client';

import {
  AI_ACTOR_MARKER,
  FORBIDDEN_AI_HEALTHCARE_ACTIONS,
  FORBIDDEN_CLIENT_FACILITY_LICENSE_FIELDS,
  FORBIDDEN_CLIENT_ORGANIZATION_SELF_LICENSE_FIELDS,
  FORBIDDEN_CLIENT_PATIENT_IDENTITY_FIELDS,
  FORBIDDEN_CLIENT_PROFESSIONAL_LICENSE_FIELDS,
  HEALTHCARE_REASON_CODES,
  PLATFORM_ADMIN_ROLE_MARKER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../healthcare.constants';

@Injectable()
export class HealthcareBoundaryService {
  assertLoginDoesNotCreateProfessionalRecord(input: {
    hasUserSession: boolean;
    creatingProfessionalRecord: boolean;
  }): void {
    if (input.hasUserSession && input.creatingProfessionalRecord) {
      throw new ForbiddenException({
        message: 'Platform login does not create a healthcare professional record',
        code: HEALTHCARE_REASON_CODES.LOGIN_NOT_PROFESSIONAL_RECORD,
      });
    }
  }

  assertOrganizationAccountIsNotLicense(input: {
    mutatingFacilityLicense: boolean;
    actorOrganizationId: string;
    targetOrganizationId: string;
  }): void {
    if (input.mutatingFacilityLicense && input.actorOrganizationId === input.targetOrganizationId) {
      throw new ForbiddenException({
        message: 'Healthcare organization cannot self-issue facility license',
        code: HEALTHCARE_REASON_CODES.SELF_LICENSING_DENIED,
      });
    }
  }

  assertRegistrationIsNotLicense(input: {
    settingLicenseStatus?: HealthcareLicenseStatus;
    withoutGovernmentDecision?: boolean;
  }): void {
    if (
      input.settingLicenseStatus === HealthcareLicenseStatus.ACTIVE &&
      input.withoutGovernmentDecision
    ) {
      throw new ForbiddenException({
        message: 'Facility or professional registration does not equate to an active license',
        code: HEALTHCARE_REASON_CODES.REGISTRATION_NOT_LICENSE,
      });
    }
  }

  rejectClientForgedPatientIdentityFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PATIENT_IDENTITY_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException({
          message: `Client may not set "${field}" on patient health identity`,
          code: HEALTHCARE_REASON_CODES.PATIENT_IDENTITY_CLIENT_SUBSTITUTION,
        });
      }
    }
  }

  rejectClientForgedProfessionalLicenseFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PROFESSIONAL_LICENSE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a professional license`);
      }
    }
  }

  rejectClientForgedFacilityLicenseFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_FACILITY_LICENSE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a facility license`);
      }
    }
  }

  rejectOrganizationSelfLicenseFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_ORGANIZATION_SELF_LICENSE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException({
          message: 'Healthcare organization cannot self-license through client submission',
          code: HEALTHCARE_REASON_CODES.SELF_LICENSING_DENIED,
        });
      }
    }
  }

  assertAiCannotActAsHealthcareProfessional(input: { actorKind?: string; action: string }): void {
    if (
      input.actorKind === AI_ACTOR_MARKER &&
      (FORBIDDEN_AI_HEALTHCARE_ACTIONS as readonly string[]).includes(input.action)
    ) {
      throw new ForbiddenException({
        message: 'AI assistance cannot act as a healthcare professional or grant clinical access',
        code: HEALTHCARE_REASON_CODES.AI_NOT_HEALTHCARE_PROFESSIONAL,
      });
    }
  }

  assertPlatformAdminDoesNotGrantClinicalAccess(input: {
    actorRoleMarker?: string;
    requestingClinicalPayload: boolean;
  }): void {
    if (
      input.requestingClinicalPayload &&
      (input.actorRoleMarker === PLATFORM_ADMIN_ROLE_MARKER ||
        input.actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER)
    ) {
      throw new ForbiddenException({
        message: 'Platform administrator does not automatically receive clinical access',
        code: HEALTHCARE_REASON_CODES.PLATFORM_ADMIN_NO_CLINICAL_ACCESS,
      });
    }
  }

  assertProviderOrganizationMembershipIsInsufficient(input: {
    hasOrganizationMembership: boolean;
    hasAuthorizedRelationship: boolean;
    hasPolicyAllow: boolean;
  }): void {
    if (
      input.hasOrganizationMembership &&
      !input.hasAuthorizedRelationship &&
      !input.hasPolicyAllow
    ) {
      throw new ForbiddenException({
        message: 'Provider organization membership alone does not create patient access',
        code: HEALTHCARE_REASON_CODES.ORG_MEMBERSHIP_INSUFFICIENT,
      });
    }
  }

  assertLicensedProfessionalRepresentation(input: {
    licenseStatus?: HealthcareLicenseStatus;
    expiresAt?: Date | null;
    now?: Date;
  }): void {
    const now = input.now ?? new Date();
    if (!input.licenseStatus || input.licenseStatus !== HealthcareLicenseStatus.ACTIVE) {
      throw new ForbiddenException({
        message:
          'Healthcare professional cannot be represented as licensed without an active license record',
        code: HEALTHCARE_REASON_CODES.UNLICENSED_PROFESSIONAL,
      });
    }

    if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) {
      throw new ForbiddenException({
        message: 'Expired professional license must be respected',
        code: HEALTHCARE_REASON_CODES.EXPIRED_PROFESSIONAL_LICENSE,
      });
    }
  }

  assertOfficialLicenseRequiresWorkflow(input: {
    governmentDecisionId?: string | null;
    authorityEvaluationRecordId?: string | null;
  }): void {
    if (!input.governmentDecisionId || !input.authorityEvaluationRecordId) {
      throw new BadRequestException(
        'Healthcare license activation requires authority evaluation and government decision linkage',
      );
    }
  }
}
