import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  DelegationStatus,
  FunctionAssignmentStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';
import { matchesDelegationStructuredScope } from '../common/delegation-scope.util';
import { isEffectiveAt } from '../common/effective-period.util';
import { type ActorResolutionResult } from './actor-resolution-result.types';
import {
  type InstitutionalActorResolutionFailure,
  type ResolvedInstitutionalActor,
} from './institutional-actor.types';

export interface ResolveInstitutionalActorInput {
  identityId: string;
  officeholderId?: string;
  officeId?: string;
  departmentId?: string;
  institutionId?: string;
  appointmentId?: string;
  delegationId?: string;
  functionAuthorityRecordId?: string;
  requestedAction?: AuthorityActionType;
  requiresDelegation?: boolean;
  at?: Date;
  externalClaims?: Record<string, unknown>;
}

@Injectable()
export class InstitutionalActorResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActorAuthority(
    input: ResolveInstitutionalActorInput,
  ): Promise<ActorResolutionResult> {
    const resolution = await this.resolve(input);
    const requestedAction = input.requestedAction ?? AuthorityActionType.DECIDE;

    if ('failure' in resolution) {
      return {
        resolved: false,
        identityId: input.identityId,
        officeholderLinkId: null,
        officeholderId: input.officeholderId ?? null,
        appointmentId: input.appointmentId ?? null,
        delegationId: input.delegationId ?? null,
        officeId: input.officeId ?? null,
        departmentId: input.departmentId ?? null,
        institutionId: input.institutionId ?? null,
        assignmentId: null,
        requestedAction,
        grantedActionTypes: [],
        failureReasons: [resolution.failure.code as AuthorityExplanationCode],
      };
    }

    const actor = resolution.actor;
    const appointment = actor.appointment;
    if (!appointment) {
      return {
        resolved: false,
        identityId: actor.identityId,
        officeholderLinkId: actor.officeholderLink.id,
        officeholderId: actor.officeholderId,
        appointmentId: null,
        delegationId: actor.delegation?.id ?? null,
        officeId: null,
        departmentId: null,
        institutionId: null,
        assignmentId: null,
        requestedAction,
        grantedActionTypes: [],
        failureReasons: [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT],
      };
    }

    const office = await this.prisma.office.findUnique({
      where: { id: appointment.officeId },
      include: { department: true },
    });

    let assignmentId: string | null = null;
    let grantedActionTypes: AuthorityActionType[] = [];

    if (input.functionAuthorityRecordId) {
      const functionRecord = await this.prisma.functionAuthorityRecord.findUnique({
        where: { id: input.functionAuthorityRecordId },
        include: { assignments: true, actionRights: true },
      });

      if (functionRecord) {
        const at = input.at ?? new Date();
        const assignment = functionRecord.assignments.find((item) => {
          if (item.status !== FunctionAssignmentStatus.ACTIVE) {
            return false;
          }
          if (
            !isEffectiveAt(
              { effectiveFrom: item.effectiveFrom, effectiveUntil: item.effectiveUntil },
              at,
            )
          ) {
            return false;
          }
          if (item.officeholderId && item.officeholderId !== actor.officeholderId) {
            return false;
          }
          if (item.officeId && item.officeId !== appointment.officeId) {
            return false;
          }
          if (item.institutionId && item.institutionId !== office?.department.institutionId) {
            return false;
          }
          return true;
        });

        assignmentId = assignment?.id ?? null;
        grantedActionTypes = functionRecord.actionRights
          .filter((right) => right.permitted)
          .map((right) => right.action);

        if (!assignment) {
          return {
            resolved: false,
            identityId: actor.identityId,
            officeholderLinkId: actor.officeholderLink.id,
            officeholderId: actor.officeholderId,
            appointmentId: appointment.id,
            delegationId: actor.delegation?.id ?? null,
            officeId: appointment.officeId,
            departmentId: office?.departmentId ?? null,
            institutionId: office?.department.institutionId ?? null,
            assignmentId: null,
            requestedAction,
            grantedActionTypes,
            failureReasons: [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ASSIGNMENT],
          };
        }

        if (!grantedActionTypes.includes(requestedAction)) {
          return {
            resolved: false,
            identityId: actor.identityId,
            officeholderLinkId: actor.officeholderLink.id,
            officeholderId: actor.officeholderId,
            appointmentId: appointment.id,
            delegationId: actor.delegation?.id ?? null,
            officeId: appointment.officeId,
            departmentId: office?.departmentId ?? null,
            institutionId: office?.department.institutionId ?? null,
            assignmentId,
            requestedAction,
            grantedActionTypes,
            failureReasons: [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ACTION_RIGHT],
          };
        }
      }
    }

    return {
      resolved: true,
      identityId: actor.identityId,
      officeholderLinkId: actor.officeholderLink.id,
      officeholderId: actor.officeholderId,
      appointmentId: appointment.id,
      delegationId: actor.delegation?.id ?? null,
      officeId: appointment.officeId,
      departmentId: office?.departmentId ?? null,
      institutionId: office?.department.institutionId ?? null,
      assignmentId,
      requestedAction,
      grantedActionTypes,
      failureReasons: [],
    };
  }

  async resolve(
    input: ResolveInstitutionalActorInput,
  ): Promise<
    { actor: ResolvedInstitutionalActor } | { failure: InstitutionalActorResolutionFailure }
  > {
    const at = input.at ?? new Date();

    const identity = await this.prisma.identity.findUnique({ where: { id: input.identityId } });
    if (!identity) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.NO_INSTITUTIONAL_ACTOR,
          message: 'Identity not found',
        },
      };
    }

    if (identity.type === IdentityType.SERVICE) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.SERVICE_IDENTITY_NOT_HUMAN,
          message: 'Service identity cannot impersonate officeholder',
        },
      };
    }

    const linkWhere = input.officeholderId
      ? { identityId: input.identityId, officeholderId: input.officeholderId }
      : { identityId: input.identityId, status: IdentityOfficeholderLinkStatus.ACTIVE };

    const officeholderLink = await this.prisma.identityOfficeholderLink.findFirst({
      where: linkWhere,
      orderBy: { linkedAt: 'desc' },
    });

    if (officeholderLink?.status !== IdentityOfficeholderLinkStatus.ACTIVE) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK,
          message: 'No active officeholder link for identity',
        },
      };
    }

    let appointment = null;
    if (input.appointmentId) {
      appointment = await this.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
      });
    } else {
      const appointments = await this.prisma.appointment.findMany({
        where: { officeholderId: officeholderLink.officeholderId },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      });
      appointment =
        appointments.find((candidate) => isAppointmentCurrent(candidate, at)) ??
        appointments[0] ??
        null;
    }

    if (!appointment) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT,
          message: 'No appointment found for officeholder',
        },
      };
    }

    if (appointment.status === AppointmentStatus.SUSPENDED) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_APPOINTMENT,
          message: 'Appointment is suspended',
        },
      };
    }

    if (!isAppointmentCurrent(appointment, at)) {
      const code =
        appointment.status === AppointmentStatus.ENDED ||
        appointment.status === AppointmentStatus.REVOKED ||
        (appointment.effectiveUntil !== null && appointment.effectiveUntil <= at)
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT
          : AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT;

      return {
        failure: {
          code,
          message: 'Appointment is not current',
        },
      };
    }

    const office = await this.prisma.office.findUnique({
      where: { id: appointment.officeId },
      include: { department: true },
    });

    if (!office) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_OFFICE,
          message: 'Office not found for appointment',
        },
      };
    }

    if (input.officeId && appointment.officeId !== input.officeId) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_OFFICE,
          message: 'Appointment does not match required office',
        },
      };
    }

    if (input.departmentId && office.departmentId !== input.departmentId) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_DEPARTMENT,
          message: 'Appointment office does not belong to required department',
        },
      };
    }

    if (input.institutionId && office.department.institutionId !== input.institutionId) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_OFFICE,
          message: 'Appointment office does not belong to required institution',
        },
      };
    }

    let delegation = null;
    if (input.delegationId) {
      delegation = await this.prisma.delegation.findUnique({
        where: { id: input.delegationId },
        include: { structuredScopes: true },
      });
    } else if (input.requiresDelegation) {
      const delegations = await this.prisma.delegation.findMany({
        where: {
          institutionId: office.department.institutionId,
          OR: [
            { recipientOfficeholderId: officeholderLink.officeholderId },
            { recipientOfficeId: appointment.officeId },
          ],
        },
        include: { structuredScopes: true },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      });

      delegation = delegations.find((candidate) => this.isDelegationUsable(candidate, at)) ?? null;

      if (!delegation && delegations.length > 0) {
        const failure = this.resolveDelegationFailure(delegations, at);
        return { failure };
      }

      if (!delegation) {
        return {
          failure: {
            code: AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION,
            message: 'No applicable delegation found',
          },
        };
      }
    }

    if (delegation) {
      const delegationFailure = this.validateDelegation(
        delegation,
        officeholderLink.officeholderId,
        appointment.officeId,
        at,
      );
      if (delegationFailure) {
        return { failure: delegationFailure };
      }

      if (input.functionAuthorityRecordId && input.requestedAction) {
        const scopeFailure = this.validateDelegationScope(
          delegation.structuredScopes,
          input.functionAuthorityRecordId,
          input.requestedAction,
        );
        if (scopeFailure) {
          return { failure: scopeFailure };
        }
      } else if (
        input.requiresDelegation &&
        input.functionAuthorityRecordId &&
        delegation.structuredScopes.length === 0
      ) {
        return {
          failure: {
            code: AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_UNRESOLVED,
            message: 'Delegation lacks machine-enforceable structured scope',
          },
        };
      }
    }

    return {
      actor: {
        identityId: identity.id,
        identityType: identity.type,
        officeholderId: officeholderLink.officeholderId,
        officeholderLink,
        appointment,
        delegation,
      },
    };
  }

  private isDelegationUsable(
    delegation: {
      status: DelegationStatus;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
    },
    at: Date,
  ): boolean {
    if (delegation.status !== DelegationStatus.ACTIVE) {
      return false;
    }

    return isEffectiveAt(
      { effectiveFrom: delegation.effectiveFrom, effectiveUntil: delegation.effectiveUntil },
      at,
    );
  }

  private validateDelegation(
    delegation: {
      status: DelegationStatus;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
      recipientOfficeholderId: string | null;
      recipientOfficeId: string | null;
    },
    officeholderId: string,
    officeId: string,
    at: Date,
  ): InstitutionalActorResolutionFailure | null {
    if (delegation.status === DelegationStatus.REVOKED) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
        message: 'Delegation has been revoked',
      };
    }

    if (delegation.status === DelegationStatus.SUSPENDED) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
        message: 'Delegation is suspended',
      };
    }

    if (
      delegation.status === DelegationStatus.ENDED ||
      !isEffectiveAt(
        { effectiveFrom: delegation.effectiveFrom, effectiveUntil: delegation.effectiveUntil },
        at,
      )
    ) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION,
        message: 'Delegation is not current',
      };
    }

    const recipientMatches =
      delegation.recipientOfficeholderId === officeholderId ||
      (delegation.recipientOfficeId !== null && delegation.recipientOfficeId === officeId);

    if (!recipientMatches) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_EXCESS,
        message: 'Delegation does not cover this actor/office',
      };
    }

    return null;
  }

  private validateDelegationScope(
    scopes: {
      functionAuthorityRecordId: string;
      allowedActionTypes: AuthorityActionType[];
    }[],
    functionAuthorityRecordId: string,
    requestedAction: AuthorityActionType,
  ): InstitutionalActorResolutionFailure | null {
    if (scopes.length === 0) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_UNRESOLVED,
        message: 'Delegation lacks machine-enforceable structured scope',
      };
    }

    const matchingScope = scopes.find((scope) =>
      matchesDelegationStructuredScope(scope, functionAuthorityRecordId, requestedAction),
    );

    if (!matchingScope) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_MISMATCH,
        message: 'Requested action is outside delegated structured scope',
      };
    }

    return null;
  }

  private resolveDelegationFailure(
    delegations: {
      status: DelegationStatus;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
    }[],
    at: Date,
  ): InstitutionalActorResolutionFailure {
    const hasRevoked = delegations.some(
      (delegation) => delegation.status === DelegationStatus.REVOKED,
    );
    if (hasRevoked) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
        message: 'Delegation has been revoked',
      };
    }

    const hasExpired = delegations.some(
      (delegation) => delegation.effectiveUntil !== null && delegation.effectiveUntil <= at,
    );
    if (hasExpired) {
      return {
        code: AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION,
        message: 'Delegation is not current',
      };
    }

    return {
      code: AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION,
      message: 'No applicable delegation found',
    };
  }

  isHumanActor(identityType: IdentityType): boolean {
    return identityType === IdentityType.INDIVIDUAL;
  }

  isServiceActor(identityType: IdentityType): boolean {
    return identityType === IdentityType.SERVICE;
  }
}
