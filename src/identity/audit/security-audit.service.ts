import { Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditEvent, SecurityAuditEventType } from '@prisma/client';

import { CanonicalAuditRecorderService } from '../../audit-governance/ledger/canonical-audit-recorder.service';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEventInput {
  eventType: SecurityAuditEventType;
  identityId?: string;
  userAccountId?: string;
  sessionId?: string;
  actorIdentityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canonicalAudit: CanonicalAuditRecorderService,
  ) {}

  async record(input: AuditEventInput): Promise<SecurityAuditEvent> {
    const event = await this.prisma.securityAuditEvent.create({
      data: this.toCreateData(input),
    });

    await this.canonicalAudit.recordSecurityAuditEvent(event);

    return event;
  }

  /**
   * Records the security event and its tamper-evident ledger entry inside the caller's
   * transaction, so they commit or roll back with the change they describe.
   */
  async recordWithinTransaction(
    tx: Prisma.TransactionClient,
    input: AuditEventInput,
  ): Promise<SecurityAuditEvent> {
    const event = await tx.securityAuditEvent.create({ data: this.toCreateData(input) });

    await this.canonicalAudit.recordSecurityAuditEventWithinTransaction(tx, event);

    return event;
  }

  async findByIdentity(identityId: string): Promise<SecurityAuditEvent[]> {
    return this.prisma.securityAuditEvent.findMany({
      where: { identityId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private toCreateData(input: AuditEventInput): Prisma.SecurityAuditEventUncheckedCreateInput {
    return {
      eventType: input.eventType,
      identityId: input.identityId,
      userAccountId: input.userAccountId,
      sessionId: input.sessionId,
      actorIdentityId: input.actorIdentityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
    };
  }
}
