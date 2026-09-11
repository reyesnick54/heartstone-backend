import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';

export interface EligibilityRuleAuditContext {
  actorIdentityId: string;
  ipAddress?: string;
}

@Injectable()
export class ServiceCatalogAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async recordRuleCreated(
    context: EligibilityRuleAuditContext,
    ruleId: string,
    versionId: string,
    snapshot: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.serviceEligibilityRuleAudit.create({
      data: {
        serviceEligibilityRuleId: ruleId,
        governmentServiceVersionId: versionId,
        actorIdentityId: context.actorIdentityId,
        action: 'CREATED',
        newSnapshot: snapshot,
      },
    });

    await this.securityAudit.record({
      eventType: 'SERVICE_ELIGIBILITY_RULE_CREATED',
      actorIdentityId: context.actorIdentityId,
      ipAddress: context.ipAddress,
      metadata: { ruleId, versionId },
    });
  }

  async recordRuleUpdated(
    context: EligibilityRuleAuditContext,
    ruleId: string,
    versionId: string,
    previousSnapshot: Prisma.InputJsonValue,
    newSnapshot: Prisma.InputJsonValue,
    isPublishedVersion: boolean,
  ): Promise<void> {
    await this.prisma.serviceEligibilityRuleAudit.create({
      data: {
        serviceEligibilityRuleId: ruleId,
        governmentServiceVersionId: versionId,
        actorIdentityId: context.actorIdentityId,
        action: 'UPDATED',
        previousSnapshot,
        newSnapshot,
      },
    });

    await this.securityAudit.record({
      eventType: isPublishedVersion
        ? 'SERVICE_ELIGIBILITY_RULE_PUBLISHED_CHANGE'
        : 'SERVICE_ELIGIBILITY_RULE_UPDATED',
      actorIdentityId: context.actorIdentityId,
      ipAddress: context.ipAddress,
      metadata: { ruleId, versionId, publishedChange: isPublishedVersion },
    });
  }
}
