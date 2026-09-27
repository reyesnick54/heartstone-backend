import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  HealthcareAccessBasisKind,
  HealthcareActorPersona,
  HealthDataRecordSensitivityClassification,
  IdentityType,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { HealthcareConsentPolicyService } from '../consent/healthcare-consent-policy.service';
import {
  HEALTHCARE_REASON_CODES,
  PLATFORM_ADMIN_ROLE_MARKER,
  RESTRICTED_HEALTHCARE_RECORD_CLASSIFICATIONS,
} from '../healthcare.constants';
import { HealthcareBoundaryService } from './healthcare-boundary.service';

export interface HealthcareDataAccessRequest {
  patientReferenceId: string;
  purposeCode: string;
  classification: HealthDataRecordSensitivityClassification;
  endpoint: string;
  consentPurposeCode?: string;
  accessBasisKind?: HealthcareAccessBasisKind;
  roleMarker?: string;
  externalProviderOrganizationId?: string;
  allowedExternalProviderOrganizationId?: string;
  bulkEnumeration?: boolean;
}

@Injectable()
export class HealthcareFoundationAccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: HealthcareBoundaryService,
    private readonly consentPolicy: HealthcareConsentPolicyService,
  ) {}

  resolveActorPersona(actor: ActorContext): HealthcareActorPersona {
    if (actor.identityType === IdentityType.SERVICE) {
      return HealthcareActorPersona.AI_ASSISTANCE;
    }
    if (actor.hasInstitutionalRelationships) {
      return HealthcareActorPersona.REGULATOR;
    }
    return HealthcareActorPersona.CLINICIAN;
  }

  async assertMayAccessHealthcareData(
    actor: ActorContext,
    request: HealthcareDataAccessRequest,
  ): Promise<void> {
    if (
      request.roleMarker === PLATFORM_ADMIN_ROLE_MARKER ||
      request.roleMarker === 'PLATFORM_ADMIN'
    ) {
      await this.recordAudit(
        actor,
        request,
        false,
        HEALTHCARE_REASON_CODES.PLATFORM_ADMIN_BYPASS_DENIED,
      );
      this.boundary.assertPlatformAdminCannotBypassHealthcarePolicy(request.roleMarker);
    }

    if (request.bulkEnumeration) {
      await this.recordAudit(
        actor,
        request,
        false,
        HEALTHCARE_REASON_CODES.BULK_ENUMERATION_DENIED,
      );
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.BULK_ENUMERATION_DENIED);
    }

    if (
      request.externalProviderOrganizationId &&
      request.allowedExternalProviderOrganizationId &&
      request.externalProviderOrganizationId !== request.allowedExternalProviderOrganizationId
    ) {
      await this.recordAudit(
        actor,
        request,
        false,
        HEALTHCARE_REASON_CODES.EXTERNAL_PROVIDER_SCOPE_DENIED,
      );
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.EXTERNAL_PROVIDER_SCOPE_DENIED);
    }

    if (RESTRICTED_HEALTHCARE_RECORD_CLASSIFICATIONS.includes(request.classification as never)) {
      const patient = await this.prisma.healthcarePatientReference.findUnique({
        where: { id: request.patientReferenceId },
      });
      if (patient?.patientIdentityId !== actor.identityId) {
        await this.recordAudit(
          actor,
          request,
          false,
          HEALTHCARE_REASON_CODES.CLASSIFICATION_DENIED,
        );
        throw new NotFoundException('Health record not found');
      }
    }

    const basis = request.accessBasisKind ?? HealthcareAccessBasisKind.PATIENT_CONSENT;
    if (basis === HealthcareAccessBasisKind.PATIENT_CONSENT) {
      await this.consentPolicy.assertActiveConsentForPurpose({
        patientReferenceId: request.patientReferenceId,
        purposeCode: request.consentPurposeCode ?? request.purposeCode,
        accessorIdentityId: actor.identityId,
      });
    }

    await this.recordAudit(actor, request, true, 'ACCESS_GRANTED');
  }

  private async recordAudit(
    actor: ActorContext,
    request: HealthcareDataAccessRequest,
    granted: boolean,
    reasonCode: string,
  ): Promise<void> {
    const data: Prisma.HealthcareDataAccessAuditCreateInput = {
      actorPersona: this.resolveActorPersona(actor),
      endpoint: request.endpoint,
      purposeCode: request.purposeCode,
      classification: request.classification,
      granted,
      reasonCode,
      accessorIdentity: { connect: { id: actor.identityId } },
    };

    if (request.patientReferenceId) {
      data.patientReferenceId = request.patientReferenceId;
    }

    await this.prisma.healthcareDataAccessAudit.create({ data });
  }
}
