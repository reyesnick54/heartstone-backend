import { ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityOfficeholderLinkStatus, IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ResolvedActorContext {
  identityId: string;
  identityType: IdentityType;
  userAccountId?: string | null;
  officeholderId?: string;
  linkedOfficeIds: string[];
  hasActiveOfficeholderLink: boolean;
  linkedInstitutionIds: string[];
}

@Injectable()
export class ActorContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFromIdentityId(identityId: string): Promise<ResolvedActorContext> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: {
        type: true,
        userAccountId: true,
        officeholderLinks: {
          where: { status: IdentityOfficeholderLinkStatus.ACTIVE },
          select: {
            officeholderId: true,
            officeholder: {
              select: {
                appointments: {
                  where: { status: 'ACTIVE' },
                  select: {
                    officeId: true,
                    office: {
                      select: {
                        department: { select: { institutionId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!identity) {
      throw new Error(`Identity "${identityId}" was not found`);
    }

    const activeLinks = identity.officeholderLinks;
    const linkedOfficeIds = activeLinks.flatMap((link) =>
      link.officeholder.appointments.map((appointment) => appointment.officeId),
    );
    const linkedInstitutionIds = [
      ...new Set(
        activeLinks.flatMap((link) =>
          link.officeholder.appointments.map(
            (appointment) => appointment.office.department.institutionId,
          ),
        ),
      ),
    ] as string[];

    return {
      identityId,
      identityType: identity.type,
      userAccountId: identity.userAccountId,
      officeholderId: activeLinks[0]?.officeholderId,
      linkedOfficeIds,
      hasActiveOfficeholderLink: activeLinks.length > 0,
      linkedInstitutionIds,
    };
  }

  assertActorIdentityMatchesSession(
    sessionIdentityId: string,
    suppliedIdentityId: string | undefined | null,
    fieldName: string,
  ): void {
    if (!suppliedIdentityId) {
      return;
    }

    if (suppliedIdentityId !== sessionIdentityId) {
      throw new ForbiddenException(
        `Client-supplied ${fieldName} must not differ from authenticated session identity`,
      );
    }
  }
}
