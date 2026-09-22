import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  HealthcareAccessDecision,
  HealthcareDataAccessPurpose,
  HealthcareDataCategory,
  HealthcareLicenseStatus,
  HealthcarePatientRelationshipKind,
} from '@prisma/client';

import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';
import { HEALTHCARE_REASON_CODES } from '../healthcare.constants';

export interface HealthcareAccessEvaluationContext {
  actorIdentityId: string;
  patientHealthIdentityId: string;
  patientLinkedPlatformIdentityId?: string | null;
  actorRoleMarker?: string;
  isAiActor?: boolean;
  accessPurpose: HealthcareDataAccessPurpose;
  dataCategory: HealthcareDataCategory;
  relationshipKinds: HealthcarePatientRelationshipKind[];
  hasOrganizationMembership?: boolean;
  hasExplicitConsent?: boolean;
  professionalLicenseStatus?: HealthcareLicenseStatus;
  professionalLicenseExpiresAt?: Date | null;
  legalOrRegulatoryBasisReference?: string | null;
  institutionId?: string | null;
  policyAllowedCategories?: HealthcareDataCategory[];
  policyAllowedPurposes?: HealthcareDataAccessPurpose[];
  policyRequiresConsent?: boolean;
  policyRequiresActiveLicense?: boolean;
  policyRequiresTreatingRelationship?: boolean;
  effectiveAt?: Date;
}

export interface HealthcareAccessEvaluationResult {
  decision: HealthcareAccessDecision;
  reasonCode?: string;
}

@Injectable()
export class HealthcareDataAccessPolicyService {
  constructor(private readonly boundary: HealthcareBoundaryService) {}

  evaluateAccess(context: HealthcareAccessEvaluationContext): HealthcareAccessEvaluationResult {
    const effectiveAt = context.effectiveAt ?? new Date();

    this.boundary.assertAiCannotActAsHealthcareProfessional({
      actorKind: context.isAiActor ? 'AI_ASSISTANCE' : undefined,
      action: 'READ_PATIENT_CLINICAL_DATA',
    });

    this.boundary.assertPlatformAdminDoesNotGrantClinicalAccess({
      actorRoleMarker: context.actorRoleMarker,
      requestingClinicalPayload: true,
    });

    if (
      context.patientLinkedPlatformIdentityId &&
      context.actorIdentityId !== context.patientLinkedPlatformIdentityId &&
      context.accessPurpose === HealthcareDataAccessPurpose.PATIENT_SELF
    ) {
      return {
        decision: HealthcareAccessDecision.DENY,
        reasonCode: HEALTHCARE_REASON_CODES.CROSS_PATIENT_ACCESS_DENIED,
      };
    }

    if (
      context.accessPurpose === HealthcareDataAccessPurpose.PATIENT_SELF &&
      context.patientLinkedPlatformIdentityId === context.actorIdentityId
    ) {
      return { decision: HealthcareAccessDecision.ALLOW };
    }

    const authorizedRelationshipKinds: HealthcarePatientRelationshipKind[] = [
      HealthcarePatientRelationshipKind.TREATING_PROVIDER,
      HealthcarePatientRelationshipKind.CARE_TEAM_MEMBER,
      HealthcarePatientRelationshipKind.GUARDIAN,
      HealthcarePatientRelationshipKind.LEGAL_REPRESENTATIVE,
    ];

    if (
      context.hasOrganizationMembership &&
      !context.relationshipKinds.some((kind) => authorizedRelationshipKinds.includes(kind))
    ) {
      try {
        this.boundary.assertProviderOrganizationMembershipIsInsufficient({
          hasOrganizationMembership: true,
          hasAuthorizedRelationship: false,
          hasPolicyAllow: false,
        });
      } catch {
        return {
          decision: HealthcareAccessDecision.DENY,
          reasonCode: HEALTHCARE_REASON_CODES.ORG_MEMBERSHIP_INSUFFICIENT,
        };
      }
    }

    if (
      context.policyAllowedPurposes &&
      !context.policyAllowedPurposes.includes(context.accessPurpose)
    ) {
      return {
        decision: HealthcareAccessDecision.DENY,
        reasonCode: HEALTHCARE_REASON_CODES.CLASSIFICATION_PURPOSE_DENIED,
      };
    }

    if (
      context.policyAllowedCategories &&
      !context.policyAllowedCategories.includes(context.dataCategory)
    ) {
      return {
        decision: HealthcareAccessDecision.DENY,
        reasonCode: HEALTHCARE_REASON_CODES.CLASSIFICATION_PURPOSE_DENIED,
      };
    }

    if (context.policyRequiresConsent && !context.hasExplicitConsent) {
      return {
        decision: HealthcareAccessDecision.DENY,
        reasonCode: HEALTHCARE_REASON_CODES.CLASSIFICATION_PURPOSE_DENIED,
      };
    }

    if (context.policyRequiresTreatingRelationship) {
      const isTreating = context.relationshipKinds.includes(
        HealthcarePatientRelationshipKind.TREATING_PROVIDER,
      );
      if (!isTreating) {
        return {
          decision: HealthcareAccessDecision.DENY,
          reasonCode: HEALTHCARE_REASON_CODES.CLASSIFICATION_PURPOSE_DENIED,
        };
      }
    }

    if (context.policyRequiresActiveLicense) {
      try {
        this.boundary.assertLicensedProfessionalRepresentation({
          licenseStatus: context.professionalLicenseStatus,
          expiresAt: context.professionalLicenseExpiresAt,
          now: effectiveAt,
        });
      } catch (error) {
        if (error instanceof ForbiddenException) {
          const response = error.getResponse() as { code?: string };
          return {
            decision: HealthcareAccessDecision.DENY,
            reasonCode: response.code ?? HEALTHCARE_REASON_CODES.UNLICENSED_PROFESSIONAL,
          };
        }
        throw error;
      }
    }

    if (
      context.relationshipKinds.includes(HealthcarePatientRelationshipKind.GUARDIAN) ||
      context.relationshipKinds.includes(HealthcarePatientRelationshipKind.LEGAL_REPRESENTATIVE)
    ) {
      return { decision: HealthcareAccessDecision.ALLOW };
    }

    if (
      context.relationshipKinds.includes(HealthcarePatientRelationshipKind.TREATING_PROVIDER) ||
      context.relationshipKinds.includes(HealthcarePatientRelationshipKind.CARE_TEAM_MEMBER)
    ) {
      return { decision: HealthcareAccessDecision.ALLOW };
    }

    if (
      context.accessPurpose === HealthcareDataAccessPurpose.CLINICAL_RESEARCH &&
      context.relationshipKinds.includes(
        HealthcarePatientRelationshipKind.CLINICAL_RESEARCH_CONTACT,
      )
    ) {
      return { decision: HealthcareAccessDecision.ALLOW };
    }

    if (
      context.accessPurpose === HealthcareDataAccessPurpose.REGULATORY_OVERSIGHT &&
      context.relationshipKinds.includes(HealthcarePatientRelationshipKind.REGULATORY_CONTACT)
    ) {
      return { decision: HealthcareAccessDecision.ALLOW };
    }

    return {
      decision: HealthcareAccessDecision.DENY,
      reasonCode: HEALTHCARE_REASON_CODES.CROSS_PATIENT_ACCESS_DENIED,
    };
  }

  assertMayReadClinicalData(context: HealthcareAccessEvaluationContext): void {
    const result = this.evaluateAccess(context);
    if (result.decision !== HealthcareAccessDecision.ALLOW) {
      throw new ForbiddenException({
        message: 'Healthcare data access denied by policy',
        code: result.reasonCode ?? HEALTHCARE_REASON_CODES.CROSS_PATIENT_ACCESS_DENIED,
      });
    }
  }
}
