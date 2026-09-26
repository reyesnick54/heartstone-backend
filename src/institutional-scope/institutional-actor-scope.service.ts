import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ActorContextService } from '../identity/auth/context/actor-context.service';
import {
  type ActorRepresentativeAuthority,
  type ActorScopeContext,
  type BuildActorContextInput,
  type OfficialInstitutionalContext,
} from './institutional-scope.types';

/**
 * Maps the canonical authenticated actor context into institutional scope evaluation shape.
 */
@Injectable()
export class InstitutionalActorScopeService {
  constructor(
    private readonly canonicalActorContext: ActorContextService,
    private readonly prisma: PrismaService,
  ) {}

  async buildFromSession(input: BuildActorContextInput): Promise<ActorScopeContext> {
    this.canonicalActorContext.assertServerDerivedSession(input.session);
    const actor = await this.canonicalActorContext.resolveFromSessionContext({
      session: input.session,
    });

    const officialContext = actor.officeholderLinks.map((link) => {
      const appointments = actor.activeAppointments.filter(
        (appointment) => appointment.officeholderId === link.officeholderId,
      );
      return this.buildOfficialContext(link.officeholderId, appointments);
    });

    const authorityRows = await this.prisma.representativeAuthority.findMany({
      where: { identityId: actor.identityId },
    });
    const representativeAuthorities: ActorRepresentativeAuthority[] = authorityRows.map(
      (authority) => ({
        id: authority.id,
        organizationId: authority.organizationId,
        identityId: actor.identityId,
        status: authority.status,
        effectiveFrom: authority.effectiveFrom,
        effectiveUntil: authority.effectiveUntil,
      }),
    );

    return {
      identityId: actor.identityId,
      sessionId: actor.sessionId,
      userAccountId: actor.userAccountId,
      identityType: actor.identityType,
      officialContext,
      representativeAuthorities,
      organizationMembershipIds: actor.organizationMemberships.map(
        (membership) => membership.organizationId,
      ),
      isTechnicalAdministrator: input.isTechnicalAdministrator ?? false,
    };
  }

  private buildOfficialContext(
    officeholderId: string,
    appointments: {
      officeId: string;
      departmentId: string;
      institutionId: string;
    }[],
  ): OfficialInstitutionalContext {
    const officeIds = new Set<string>();
    const departmentIds = new Set<string>();
    const institutionIds = new Set<string>();

    for (const appointment of appointments) {
      officeIds.add(appointment.officeId);
      departmentIds.add(appointment.departmentId);
      institutionIds.add(appointment.institutionId);
    }

    return {
      officeholderId,
      officeIds: [...officeIds],
      departmentIds: [...departmentIds],
      institutionIds: [...institutionIds],
    };
  }
}

/** @deprecated Use InstitutionalActorScopeService */
export { InstitutionalActorScopeService as ActorContextService };
