import { Injectable } from '@nestjs/common';

import { ActorContextService as CanonicalActorContextService } from '../identity/auth/context/actor-context.service';
import {
  ActorScopeContext,
  BuildActorContextInput,
  OfficialInstitutionalContext,
} from './institutional-scope.types';

@Injectable()
export class ActorContextService {
  constructor(private readonly canonicalActorContext: CanonicalActorContextService) {}

  async buildFromSession(input: BuildActorContextInput): Promise<ActorScopeContext> {
    const actor = await this.canonicalActorContext.resolveFromSessionContext({
      session: input.session,
    });

    const officialContext = actor.officeholderLinks.map((link) =>
      this.buildOfficialContext(
        link.officeholderId,
        actor.activeAppointments.filter(
          (appointment) => appointment.officeholderId === link.officeholderId,
        ),
      ),
    );

    return {
      identityId: actor.identityId,
      sessionId: actor.sessionId,
      userAccountId: actor.userAccountId,
      identityType: actor.identityType,
      officialContext,
      representativeAuthorities: actor.representativeAuthorities.map((authority) => ({
        id: authority.representativeAuthorityId,
        organizationId: authority.organizationId,
        identityId: actor.identityId,
        status: authority.status,
        effectiveFrom: authority.effectiveFrom,
        effectiveUntil: authority.effectiveUntil,
      })),
      organizationMembershipIds: actor.organizationMemberships.map(
        (membership) => membership.organizationId,
      ),
      isTechnicalAdministrator: input.isTechnicalAdministrator ?? false,
    };
  }

  private buildOfficialContext(
    officeholderId: string,
    appointments: { officeId: string; departmentId: string; institutionId: string }[],
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
