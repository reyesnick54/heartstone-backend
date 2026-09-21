import { Injectable, NotFoundException } from '@nestjs/common';
import { IdentityOfficeholderLinkStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import {
  ActorScopeContext,
  BuildActorContextInput,
  OfficialInstitutionalContext,
} from './institutional-scope.types';

@Injectable()
export class ActorContextService {
  constructor(private readonly prisma: PrismaService) {}

  async buildFromSession(input: BuildActorContextInput): Promise<ActorScopeContext> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: input.session.identityId },
      include: {
        officeholderLinks: {
          where: { status: IdentityOfficeholderLinkStatus.ACTIVE },
          include: {
            officeholder: {
              include: {
                appointments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    office: {
                      select: {
                        id: true,
                        departmentId: true,
                        department: { select: { institutionId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        representativeAuthorities: true,
        memberships: { select: { organizationId: true } },
      },
    });

    if (!identity) {
      throw new NotFoundException(`Identity "${input.session.identityId}" was not found`);
    }

    const officialContext = identity.officeholderLinks.map((link) =>
      this.buildOfficialContext(link.officeholderId, link.officeholder.appointments),
    );

    return {
      identityId: identity.id,
      sessionId: input.session.sessionId,
      userAccountId: input.session.userAccountId,
      identityType: identity.type,
      officialContext,
      representativeAuthorities: identity.representativeAuthorities.map((authority) => ({
        id: authority.id,
        organizationId: authority.organizationId,
        identityId: authority.identityId,
        status: authority.status,
        effectiveFrom: authority.effectiveFrom,
        effectiveUntil: authority.effectiveUntil,
      })),
      organizationMembershipIds: identity.memberships.map(
        (membership) => membership.organizationId,
      ),
      isTechnicalAdministrator: input.isTechnicalAdministrator ?? false,
    };
  }

  private buildOfficialContext(
    officeholderId: string,
    appointments: {
      office: {
        id: string;
        departmentId: string;
        department: { institutionId: string };
      };
    }[],
  ): OfficialInstitutionalContext {
    const officeIds = new Set<string>();
    const departmentIds = new Set<string>();
    const institutionIds = new Set<string>();

    for (const appointment of appointments) {
      officeIds.add(appointment.office.id);
      departmentIds.add(appointment.office.departmentId);
      institutionIds.add(appointment.office.department.institutionId);
    }

    return {
      officeholderId,
      officeIds: [...officeIds],
      departmentIds: [...departmentIds],
      institutionIds: [...institutionIds],
    };
  }
}
