import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { TransportationActorPersona } from '@prisma/client';

import { FORBIDDEN_AI_TRANSPORTATION_ACTIONS } from '../transportation.constants';

@Injectable()
export class TransportationBoundaryService {
  assertAiCannotApproveDriverLicense(action: string): void {
    if (FORBIDDEN_AI_TRANSPORTATION_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(`AI assistance cannot perform transportation action: ${action}`);
    }
  }

  assertPaymentDoesNotIssueDriverLicense(actorPersona: TransportationActorPersona): void {
    if (actorPersona === TransportationActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException(
        'Payment receipt does not issue or approve a driver license or vehicle registration',
      );
    }
  }

  assertTechnicalAdminCannotIssueDriverLicense(
    actorPersona: TransportationActorPersona,
    target: 'DRIVER_LICENSE' | 'VEHICLE_REGISTRATION' | 'TRANSPORT_PERMIT',
  ): void {
    if (actorPersona === TransportationActorPersona.TECHNICAL_ADMIN) {
      throw new ForbiddenException(
        `Technical administration cannot issue authoritative ${target.replace('_', ' ').toLowerCase()}`,
      );
    }
  }

  assertTestPassDoesNotIssueLicense(input: {
    outcome: string;
    doesNotIssueLicense: boolean;
    isLicenseIssuance: boolean;
  }): void {
    if (input.outcome === 'PASSED' && input.doesNotIssueLicense && !input.isLicenseIssuance) {
      return;
    }
    if (input.isLicenseIssuance && !input.doesNotIssueLicense) {
      throw new BadRequestException(
        'Driver test records must not be marked as license issuance unless governed issuance workflow applies',
      );
    }
  }

  assertFailedInspectionDoesNotRevokeRegistration(input: {
    inspectionResultDoesNotRevokeRegistration: boolean;
    registrationRevokedWithoutDecision: boolean;
  }): void {
    if (
      input.inspectionResultDoesNotRevokeRegistration &&
      input.registrationRevokedWithoutDecision
    ) {
      throw new BadRequestException(
        'Failed inspection cannot silently revoke registration; a governed decision or configured workflow is required',
      );
    }
  }

  assertCitizenCannotRegisterAnotherOwnersVehicle(input: {
    requesterIdentityId: string;
    ownerIdentityId?: string | null;
    hasRepresentativeAuthority: boolean;
  }): void {
    if (
      input.ownerIdentityId &&
      input.requesterIdentityId !== input.ownerIdentityId &&
      !input.hasRepresentativeAuthority
    ) {
      throw new ForbiddenException(
        'Citizens cannot register a vehicle for another person without authorized representative authority',
      );
    }
  }

  assertCrossSubjectBlocked(requesterIdentityId: string, subjectIdentityId: string): void {
    if (requesterIdentityId !== subjectIdentityId) {
      throw new ForbiddenException('Cross-subject transportation profile access is not permitted');
    }
  }

  assertFleetOrganizationScope(input: {
    organizationId: string;
    requesterOrganizationId?: string | null;
    authorizedScope: Record<string, boolean>;
    requested: 'viewFleetVehicles' | 'manageFleetVehicles';
  }): void {
    if (input.requesterOrganizationId !== input.organizationId) {
      throw new ForbiddenException('Fleet access requires matching organization scope');
    }
    if (!input.authorizedScope[input.requested]) {
      throw new ForbiddenException(`Fleet access denied for scope: ${input.requested}`);
    }
  }

  assertLicenseRequiresGovernmentDecision(input: {
    requiresGovernmentDecision: boolean;
    governmentDecisionId?: string | null;
    lifecycleStatus: string;
  }): void {
    const issuing =
      input.lifecycleStatus === 'EFFECTIVE' || input.lifecycleStatus === 'PENDING_ISSUANCE';
    if (input.requiresGovernmentDecision && issuing && !input.governmentDecisionId) {
      throw new BadRequestException(
        'Driver license issuance requires an linked government decision',
      );
    }
  }
}
