import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CredentialStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { isAppointmentCurrent } from '../../../government/common/appointment-current.util';
import { ActorContextDto } from '../dto/actor-context.dto';
import { type SessionContextDto } from '../dto/session-context.dto';
import { type InstitutionalScopeEntry } from '../types/institutional-scope.types';

@Injectable()
export class ActorContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFromSession(session: SessionContextDto): Promise<ActorContextDto> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: session.identityId },
      include: {
        authenticationMethods: true,
        credentials: true,
      },
    });

    if (!identity) {
      throw new UnauthorizedException('Session identity not found');
    }

    const institutionalScopes = await this.resolveInstitutionalScopes(session.identityId);
    const isAiActor = this.isAiActorIdentity(identity.type);
    const isSuspendedAiAgent =
      isAiActor && this.isAiAgentSuspended(identity.authenticationMethods, identity.credentials);

    return {
      sessionId: session.sessionId,
      identityId: session.identityId,
      userAccountId: session.userAccountId ?? undefined,
      assuranceLevel: session.assuranceLevel,
      identityType: identity.type,
      institutionalScopes,
      isAiActor,
      isSuspendedAiAgent,
    };
  }

  private async resolveInstitutionalScopes(identityId: string): Promise<InstitutionalScopeEntry[]> {
    const links = await this.prisma.identityOfficeholderLink.findMany({
      where: {
        identityId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
      orderBy: { linkedAt: 'desc' },
    });

    const scopes: InstitutionalScopeEntry[] = [];
    const seen = new Set<string>();

    for (const link of links) {
      const appointments = await this.prisma.appointment.findMany({
        where: { officeholderId: link.officeholderId },
        include: {
          office: {
            include: { department: true },
          },
        },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      });

      for (const appointment of appointments) {
        if (!isAppointmentCurrent(appointment)) {
          continue;
        }

        const department = appointment.office.department;
        const key = `${department.institutionId}:${department.id}:${appointment.officeId}:${link.officeholderId}:${appointment.id}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        scopes.push({
          institutionId: department.institutionId,
          departmentId: department.id,
          officeId: appointment.officeId,
          officeholderId: link.officeholderId,
          appointmentId: appointment.id,
        });
      }
    }

    return scopes;
  }

  private isAiActorIdentity(type: IdentityType): boolean {
    return type === IdentityType.SERVICE;
  }

  private isAiAgentSuspended(
    authenticationMethods: { isEnabled: boolean }[],
    credentials: { status: CredentialStatus }[],
  ): boolean {
    if (authenticationMethods.length > 0 && authenticationMethods.every((method) => !method.isEnabled)) {
      return true;
    }

    return credentials.length > 0 && credentials.every((credential) => credential.status === CredentialStatus.REVOKED);
  }
}
