import { Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditEventType } from '@prisma/client';

import { SecurityAuditService } from '../../identity/audit/security-audit.service';

export interface AuthorityAuditContext {
  actorIdentityId?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthorityAuditService {
  constructor(private readonly securityAudit: SecurityAuditService) {}

  async record(
    eventType: SecurityAuditEventType,
    metadata: Prisma.InputJsonValue,
    context?: AuthorityAuditContext,
  ): Promise<void> {
    await this.securityAudit.record({
      eventType,
      actorIdentityId: context?.actorIdentityId,
      metadata,
      ipAddress: context?.ipAddress,
    });
  }
}
