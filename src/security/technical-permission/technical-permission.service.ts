import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccountStatus, IdentityType, TechnicalAccessPolicyScope } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { type TechnicalPermissionCode } from './technical-permission.constants';

export interface AssertTechnicalPermissionInput {
  session: SessionContextDto;
  permissionCode: TechnicalPermissionCode;
  endpoint: string;
  institutionId?: string;
}

@Injectable()
export class TechnicalPermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async assertPermission(input: AssertTechnicalPermissionInput): Promise<void> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: input.session.identityId },
      include: { userAccount: true },
    });

    if (!identity) {
      throw new ForbiddenException('Identity not found');
    }

    if (identity.type === IdentityType.SERVICE) {
      throw new ForbiddenException('Service identities cannot perform administrative operations');
    }

    if (identity.userAccount?.status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Suspended account cannot perform administrative operations');
    }

    const now = new Date();
    const policies = await this.prisma.technicalAccessPolicy.findMany({
      where: {
        identityId: identity.id,
        permissionCode: input.permissionCode,
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
        ],
      },
    });

    const matching = policies.filter((policy) =>
      this.policyCoversInstitution(policy, input.institutionId),
    );

    if (matching.length === 0) {
      await this.securityAudit.record({
        eventType: 'TECHNICAL_PERMISSION_DENIED',
        identityId: identity.id,
        sessionId: input.session.sessionId,
        metadata: {
          permissionCode: input.permissionCode,
          endpoint: input.endpoint,
          institutionId: input.institutionId ?? null,
        },
      });
      throw new ForbiddenException('Technical permission required for this administrative route');
    }
  }

  private policyCoversInstitution(
    policy: {
      scope: TechnicalAccessPolicyScope;
      institutionId: string | null;
    },
    targetInstitutionId?: string,
  ): boolean {
    if (!targetInstitutionId) {
      return (
        policy.scope === TechnicalAccessPolicyScope.PLATFORM_WIDE || policy.institutionId === null
      );
    }

    if (
      policy.scope === TechnicalAccessPolicyScope.PLATFORM_WIDE &&
      policy.institutionId === null
    ) {
      return true;
    }

    return policy.institutionId === targetInstitutionId;
  }
}
