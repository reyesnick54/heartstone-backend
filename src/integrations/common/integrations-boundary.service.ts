import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AuthoritativeSourceStatus,
  IntegrationAcceptanceState,
  IntegrationVersionStatus,
} from '@prisma/client';

import {
  FORBIDDEN_AUTHORITATIVE_DESIGNATION_CLIENT_FIELDS,
  FORBIDDEN_CREDENTIAL_RESPONSE_FIELDS,
  FORBIDDEN_INTEGRATION_DEFINITION_CLIENT_FIELDS,
  FORBIDDEN_INTEGRATION_VERSION_CLIENT_FIELDS,
  FORBIDDEN_TECHNICAL_CONNECTION_FIELDS,
  IMMUTABLE_ACCEPTED_VERSION_FIELDS,
  INTEGRATION_ACCEPTANCE_ACTIVE_GATE_STATES,
} from '../integrations.constants';

@Injectable()
export class IntegrationsBoundaryService {
  rejectForbiddenDefinitionFields(payload: Record<string, unknown>): void {
    this.rejectFields(payload, FORBIDDEN_INTEGRATION_DEFINITION_CLIENT_FIELDS, 'integration definition');
  }

  rejectForbiddenVersionFields(payload: Record<string, unknown>): void {
    this.rejectFields(payload, FORBIDDEN_INTEGRATION_VERSION_CLIENT_FIELDS, 'integration version');
  }

  rejectForbiddenAuthoritativeDesignationFields(payload: Record<string, unknown>): void {
    this.rejectFields(
      payload,
      FORBIDDEN_AUTHORITATIVE_DESIGNATION_CLIENT_FIELDS,
      'authoritative source designation',
    );
  }

  rejectTechnicalConnectionCannotSetAuthoritative(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_TECHNICAL_CONNECTION_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(
          `Technical connection cannot set ${field}; acceptance and authority require separate institutional pathways`,
        );
      }
    }
  }

  assertTechnicalAdminCannotDesignateAuthoritativeByRole(
    actorRole: string,
    requestedSourceStatus: AuthoritativeSourceStatus,
  ): void {
    if (
      requestedSourceStatus === AuthoritativeSourceStatus.AUTHORITATIVE &&
      (actorRole === 'TECHNICAL_ADMIN' || actorRole === 'SYSTEM_ADMIN')
    ) {
      throw new ForbiddenException(
        'Technical administration role alone cannot designate a government source as AUTHORITATIVE',
      );
    }
  }

  assertAuthoritativeDesignationRequiresInstitutionalAcceptance(
    acceptanceState: IntegrationAcceptanceState,
  ): void {
    const institutionalStates: IntegrationAcceptanceState[] = [
      IntegrationAcceptanceState.INSTITUTIONALLY_ACCEPTED,
      IntegrationAcceptanceState.ACTIVE,
    ];

    if (!institutionalStates.includes(acceptanceState)) {
      throw new BadRequestException(
        'Authoritative source designation requires institutional acceptance; connected != authoritative',
      );
    }
  }

  assertProhibitedFieldNotInPermittedList(
    fieldName: string,
    prohibitedFields: string[],
  ): void {
    if (prohibitedFields.includes(fieldName)) {
      throw new BadRequestException(
        `Field "${fieldName}" is prohibited and cannot be added to permitted exchange contract fields`,
      );
    }
  }

  assertFieldAuthorityPreserved(
    designationSourceStatus: AuthoritativeSourceStatus,
    fieldSourceStatus: AuthoritativeSourceStatus,
    fieldName: string,
  ): void {
    if (
      designationSourceStatus !== AuthoritativeSourceStatus.AUTHORITATIVE &&
      fieldSourceStatus === AuthoritativeSourceStatus.AUTHORITATIVE
    ) {
      throw new BadRequestException(
        `Field "${fieldName}" cannot be AUTHORITATIVE when parent designation is not AUTHORITATIVE`,
      );
    }
  }

  sanitizeCredentialReference(record: {
    secretReference?: string | null;
    certificateReference?: string | null;
    expiration?: Date | string | null;
    [key: string]: unknown;
  }): Record<string, unknown> & {
    secretReferenceConfigured: boolean;
    certificateReferenceConfigured: boolean;
    isExpired: boolean;
  } {
    const { secretReference, certificateReference, expiration, ...rest } = record;
    const sanitized: Record<string, unknown> = { ...rest };

    for (const forbidden of FORBIDDEN_CREDENTIAL_RESPONSE_FIELDS) {
      if (forbidden in sanitized) {
        sanitized[forbidden] = undefined;
      }
    }

    const expirationDate =
      expiration instanceof Date
        ? expiration
        : typeof expiration === 'string'
          ? new Date(expiration)
          : null;

    return {
      ...sanitized,
      secretReferenceConfigured: Boolean(secretReference),
      certificateReferenceConfigured: Boolean(certificateReference),
      isExpired: expirationDate !== null && expirationDate.getTime() < Date.now(),
    };
  }

  assertExecutionAvailable(
    definitionStatus: string,
    versionStatus: IntegrationVersionStatus,
    acceptanceState: IntegrationAcceptanceState,
  ): void {
    if (definitionStatus === 'SUSPENDED' || definitionStatus === 'RETIRED') {
      throw new BadRequestException('Suspended or retired integration is unavailable for execution');
    }

    if (
      versionStatus === IntegrationVersionStatus.SUSPENDED ||
      versionStatus === IntegrationVersionStatus.RETIRED
    ) {
      throw new BadRequestException('Suspended or retired integration version is unavailable for execution');
    }

    if (
      acceptanceState === IntegrationAcceptanceState.SUSPENDED ||
      acceptanceState === IntegrationAcceptanceState.RETIRED
    ) {
      throw new BadRequestException('Suspended or retired acceptance state blocks execution availability');
    }
  }

  assertAcceptedVersionImmutable(
    acceptedAt: Date | null,
    dto: Record<string, unknown>,
  ): void {
    if (!acceptedAt) {
      return;
    }

    for (const field of IMMUTABLE_ACCEPTED_VERSION_FIELDS) {
      if (field in dto) {
        throw new BadRequestException(
          `Accepted integration version is immutable; cannot modify ${field} in place`,
        );
      }
    }
  }

  assertActiveRequiresAcceptanceGates(
    achievedStates: IntegrationAcceptanceState[],
  ): void {
    for (const required of INTEGRATION_ACCEPTANCE_ACTIVE_GATE_STATES) {
      if (!achievedStates.includes(required)) {
        throw new BadRequestException(
          `Integration cannot become ACTIVE without acceptance gate: ${required}`,
        );
      }
    }
  }

  assertSystemOwnershipNotInstitutionalAuthority(
    systemOwner: string,
    institutionalDecisionActorId?: string,
  ): void {
    if (institutionalDecisionActorId && systemOwner === institutionalDecisionActorId) {
      throw new BadRequestException(
        'System ownership identifier must not be conflated with institutional decision authority',
      );
    }
  }

  assertNewIntegrationDefaultsNonAuthoritative(
    sourceStatus: AuthoritativeSourceStatus | undefined,
  ): void {
    if (sourceStatus === AuthoritativeSourceStatus.AUTHORITATIVE) {
      throw new BadRequestException(
        'New integrations default to non-authoritative; AUTHORITATIVE status requires explicit designation pathway',
      );
    }
  }

  private rejectFields(
    payload: Record<string, unknown>,
    fields: readonly string[],
    context: string,
  ): void {
    for (const field of fields) {
      if (field in payload) {
        throw new BadRequestException(`Client may not set ${context} field: ${field}`);
      }
    }
  }
}
