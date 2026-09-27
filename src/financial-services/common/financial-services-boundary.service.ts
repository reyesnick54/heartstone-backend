import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  FinancialDelegatedFunctionActivation,
  FinancialExternalRegulatoryDependencyStatus,
  FinancialServicesActorPersona,
} from '@prisma/client';

import {
  FINANCIAL_SERVICES_REASON_CODES,
  FORBIDDEN_AI_FINANCIAL_SERVICES_ACTIONS,
} from '../financial-services.constants';
import {
  FORBIDDEN_CLIENT_EXTERNAL_DETERMINATION_FIELDS,
  FORBIDDEN_CLIENT_LICENCE_ISSUANCE_FIELDS,
} from '../financial-services-schema.constants';

@Injectable()
export class FinancialServicesBoundaryService {
  rejectClientForgedLicenceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_LICENCE_ISSUANCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${FINANCIAL_SERVICES_REASON_CODES.CLIENT_LICENCE_FIELDS_FORBIDDEN}: ${field}`,
        );
      }
    }
  }

  rejectApplicantForgedExternalDetermination(
    payload: Record<string, unknown>,
    actorPersona: FinancialServicesActorPersona,
  ): void {
    if (actorPersona === FinancialServicesActorPersona.APPLICANT) {
      throw new ForbiddenException(
        FINANCIAL_SERVICES_REASON_CODES.NATIONAL_APPROVAL_CANNOT_BE_SPOOFED,
      );
    }
    for (const field of FORBIDDEN_CLIENT_EXTERNAL_DETERMINATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${FINANCIAL_SERVICES_REASON_CODES.NATIONAL_APPROVAL_CANNOT_BE_SPOOFED}: ${field}`,
        );
      }
    }
  }

  assertApplicantCannotSelfIssueLicence(actorPersona: FinancialServicesActorPersona): void {
    if (actorPersona === FinancialServicesActorPersona.APPLICANT) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE);
    }
  }

  assertAiCannotIssueLicence(action: string): void {
    if (
      FORBIDDEN_AI_FINANCIAL_SERVICES_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_FINANCIAL_SERVICES_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(`${FINANCIAL_SERVICES_REASON_CODES.AI_CANNOT_ISSUE_LICENCE}: ${action}`);
    }
  }

  assertTechnicalAdminCannotIssueLicence(actorPersona: FinancialServicesActorPersona): void {
    if (actorPersona === FinancialServicesActorPersona.TECHNICAL_ADMIN) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.LICENCE_AUTHORITY_NOT_CONFIGURED);
    }
  }

  assertDelegatedFunctionActiveForIssuance(
    activation: FinancialDelegatedFunctionActivation,
    requiresDelegatedIssuance: boolean,
  ): void {
    if (
      requiresDelegatedIssuance &&
      activation !== FinancialDelegatedFunctionActivation.ACTIVE
    ) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.DELEGATED_FUNCTION_INACTIVE);
    }
  }

  assertExternalDependenciesResolved(
    dependencies: {
      blocksAbsezLicenceDecision: boolean;
      status: FinancialExternalRegulatoryDependencyStatus;
    }[],
  ): void {
    const blocking = dependencies.filter(
      (dependency) =>
        dependency.blocksAbsezLicenceDecision &&
        dependency.status !== FinancialExternalRegulatoryDependencyStatus.RESOLVED,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(FINANCIAL_SERVICES_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS);
    }
  }

  assertCannotSpoofNationalApprovalAsAbsez(input: {
    requiresNationalDetermination: boolean;
    absezIssuanceAuthorized: boolean;
    externalResolved: boolean;
    spoofedAbsezApprovalAttempt?: boolean;
  }): void {
    if (input.spoofedAbsezApprovalAttempt) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.NATIONAL_APPROVAL_CANNOT_BE_SPOOFED);
    }
    if (input.requiresNationalDetermination && input.absezIssuanceAuthorized && !input.externalResolved) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.NATIONAL_APPROVAL_CANNOT_BE_SPOOFED);
    }
  }

  assertApplicationProfileDoesNotIssueLicence(
    doesNotIssueLicence: boolean,
    licencesCreated: number,
  ): void {
    if (!doesNotIssueLicence && licencesCreated > 0) {
      throw new BadRequestException('Licence application profile must not issue licences at link time');
    }
    if (licencesCreated > 0) {
      throw new BadRequestException('Linking an application profile cannot create a financial licence');
    }
  }

  assertSuspensionRequiresConfiguredAuthority(input: {
    functionAuthorityRecordId?: string | null;
    authorityEvaluationRecordId?: string | null;
    governmentDecisionId?: string | null;
  }): void {
    const hasAuthority =
      Boolean(input.functionAuthorityRecordId) ||
      Boolean(input.authorityEvaluationRecordId) ||
      Boolean(input.governmentDecisionId);
    if (!hasAuthority) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.SUSPENSION_AUTHORITY_REQUIRED);
    }
  }

  assertInspectionFindingIsNotFinalEnforcement(isFinalEnforcementDecision: boolean): void {
    if (isFinalEnforcementDecision) {
      throw new BadRequestException(
        'Financial inspection references record findings separately from final enforcement decisions',
      );
    }
  }

  assertCrossEntityAccessBlocked(
    accessorOrganizationId: string | null | undefined,
    entityOrganizationId: string,
  ): void {
    if (!accessorOrganizationId || accessorOrganizationId !== entityOrganizationId) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.CROSS_ENTITY_ACCESS_DENIED);
    }
  }

  assertRegulatoryFileAccessDenied(actorPersona: FinancialServicesActorPersona): void {
    if (actorPersona === FinancialServicesActorPersona.APPLICANT) {
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED);
    }
  }
}
