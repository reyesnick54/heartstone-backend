import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { type PlatformAdminExperienceRequest } from '../decorators/current-platform-admin-context.decorator';
import { PlatformAdminAccessDeniedException } from '../exceptions/platform-admin-access-denied.exception';
import { PlatformAdministrativeAccessPolicyService } from '../policy/platform-administrative-access-policy.service';

@Injectable()
export class PlatformAdminExperienceGuard implements CanActivate {
  constructor(
    private readonly accessPolicy: PlatformAdministrativeAccessPolicyService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<PlatformAdminExperienceRequest & { session?: SessionContextDto }>();
    const session = request.session;

    if (!session?.identityId) {
      throw new UnauthorizedException('Authentication required for platform admin experience');
    }

    const handler = context.getHandler();
    const controller = context.getClass();
    const endpoint = `${controller.name}.${handler.name}`;

    const resolved = await this.accessPolicy.evaluateAccess({
      session,
      endpoint,
    });

    const identity = await this.prisma.identity.findUnique({
      where: { id: session.identityId },
      select: { type: true },
    });

    if (identity?.type === IdentityType.SERVICE) {
      throw new PlatformAdminAccessDeniedException(
        'Service or AI identities cannot access platform administration',
      );
    }

    request.platformAdminContext = resolved;
    return true;
  }
}
