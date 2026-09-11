import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  DelegationStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { isEffectiveAt } from '../common/effective-period.util';
import {
  type InstitutionalActorResolutionFailure,
  type ResolvedInstitutionalActor,
} from './institutional-actor.types';

export interface ResolveInstitutionalActorInput {
  identityId: string;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  at?: Date;
}

@Injectable()
export class InstitutionalActorResolver {
  constructor(private readonly prisma: PrismaService) {}

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
    } else if (input.officeId) {
      appointment = await this.prisma.appointment.findFirst({
        where: {
          officeholderId: officeholderLink.officeholderId,
          officeId: input.officeId,
        },
        orderBy: [{ effectiveFrom: 'desc' }],
      });
    } else {
      appointment = await this.prisma.appointment.findFirst({
        where: { officeholderId: officeholderLink.officeholderId },
        orderBy: [{ effectiveFrom: 'desc' }],
      });
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

    if (input.officeId && appointment.officeId !== input.officeId) {
      return {
        failure: {
          code: AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_OFFICE,
          message: 'Appointment does not match required office',
        },
      };
    }

    let delegation = null;
    if (input.delegationId) {
      delegation = await this.prisma.delegation.findUnique({ where: { id: input.delegationId } });
    }

    if (delegation) {
      if (delegation.status === DelegationStatus.REVOKED) {
        return {
          failure: {
            code: AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
            message: 'Delegation has been revoked',
          },
        };
      }

      if (delegation.status === DelegationStatus.SUSPENDED) {
        return {
          failure: {
            code: AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
            message: 'Delegation is suspended',
          },
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
          failure: {
            code: AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION,
            message: 'Delegation is not current',
          },
        };
      }

      const recipientMatches =
        delegation.recipientOfficeholderId === officeholderLink.officeholderId ||
        (delegation.recipientOfficeId !== null &&
          delegation.recipientOfficeId === appointment.officeId);

      if (!recipientMatches) {
        return {
          failure: {
            code: AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_EXCESS,
            message: 'Delegation does not cover this actor/office',
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

  isHumanActor(identityType: IdentityType): boolean {
    return identityType === IdentityType.INDIVIDUAL;
  }

  isServiceActor(identityType: IdentityType): boolean {
    return identityType === IdentityType.SERVICE;
  }
}
