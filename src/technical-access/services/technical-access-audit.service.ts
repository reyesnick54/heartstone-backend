import { Injectable } from '@nestjs/common';
import { Prisma, TechnicalAccessAuditResult, TechnicalAccessScopeType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';

export interface TechnicalAccessAuditInput {
  identityId: string;
  sessionId?: string;
  userAccountId?: string;
  permissionCode?: string;
  endpoint: string;
  accessResult: TechnicalAccessAuditResult;
  scopeType?: TechnicalAccessScopeType;
  scopeInstitutionId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class TechnicalAccessAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async record(input: TechnicalAccessAuditInput): Promise<void> {
    await this.prisma.technicalAccessAuditEvent.create({
      data: {
        identityId: input.identityId,
        sessionId: input.sessionId,
        permissionCode: input.permissionCode,
        endpoint: input.endpoint,
        accessResult: input.accessResult,
        scopeType: input.scopeType,
        scopeInstitutionId: input.scopeInstitutionId,
        metadata: input.metadata ?? {},
      },
    });

    const eventType =
      input.accessResult === TechnicalAccessAuditResult.GRANTED
        ? 'TECHNICAL_PERMISSION_GRANTED'
        : 'TECHNICAL_PERMISSION_DENIED';

    await this.securityAudit.record({
      eventType,
      identityId: input.identityId,
      userAccountId: input.userAccountId,
      sessionId: input.sessionId,
      actorIdentityId: input.identityId,
      metadata: {
        permissionCode: input.permissionCode,
        endpoint: input.endpoint,
        accessResult: input.accessResult,
        scopeType: input.scopeType,
        scopeInstitutionId: input.scopeInstitutionId,
        ...(input.metadata as Record<string, unknown> | undefined),
      },
    });
  }
}
