import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CredentialStatus, IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';

@Injectable()
export class IntelligenceSuspendedAiGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ actor?: ActorContext }>();
    const actor = request.actor;

    if (!actor) {
      throw new UnauthorizedException('Authenticated actor context required');
    }

    if (actor.identityType !== IdentityType.SERVICE) {
      return true;
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: actor.identityId },
      include: {
        authenticationMethods: true,
        credentials: true,
      },
    });

    if (!identity) {
      throw new UnauthorizedException('Session identity not found');
    }

    const methodsDisabled =
      identity.authenticationMethods.length > 0 &&
      identity.authenticationMethods.every((method) => !method.isEnabled);

    const credentialsRevoked =
      identity.credentials.length > 0 &&
      identity.credentials.every((credential) => credential.status === CredentialStatus.REVOKED);

    if (methodsDisabled || credentialsRevoked) {
      throw new ForbiddenException('Suspended AI agent cannot perform intelligence operations');
    }

    return true;
  }
}
