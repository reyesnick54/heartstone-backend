import { Injectable } from '@nestjs/common';
import { type SecurityAuditEvent, type SecurityAuditEventType } from '@prisma/client';

import { GOVERNMENT_AUDIT_EVENT_TYPES } from '../audit-governance.constants';
import { GovernmentAuditLedgerService } from './government-audit-ledger.service';

@Injectable()
export class CanonicalAuditRecorderService {
  constructor(private readonly ledger: GovernmentAuditLedgerService) {}

  async recordSecurityAuditEvent(event: SecurityAuditEvent): Promise<void> {
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;

    await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.SECURITY_EVENT,
      occurredAt: event.createdAt,
      actorIdentityId: event.actorIdentityId ?? event.identityId ?? undefined,
      sessionId: event.sessionId ?? undefined,
      action: event.eventType,
      outcome: 'RECORDED',
      resourceType: 'SecurityAuditEvent',
      resourceId: event.id,
      metadata: {
        securityEventType: event.eventType,
        userAccountId: event.userAccountId,
        ipAddress: event.ipAddress,
        ...metadata,
      },
      sourceDomainEventType: 'SecurityAuditEvent',
      sourceDomainEventId: event.id,
      institutionId:
        typeof metadata.scopeInstitutionId === 'string' ? metadata.scopeInstitutionId : undefined,
    });
  }

  async recordSecurityAuditInput(input: {
    eventType: SecurityAuditEventType;
    identityId?: string;
    actorIdentityId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    institutionId?: string;
    sourceEventId?: string;
  }): Promise<void> {
    await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.SECURITY_EVENT,
      actorIdentityId: input.actorIdentityId ?? input.identityId,
      sessionId: input.sessionId,
      institutionId: input.institutionId,
      action: input.eventType,
      outcome: 'RECORDED',
      metadata: input.metadata,
      sourceDomainEventType: input.sourceEventId ? 'SecurityAuditEvent' : undefined,
      sourceDomainEventId: input.sourceEventId,
    });
  }

  async recordAuthorityEvaluation(input: {
    recordId: string;
    identityId: string;
    institutionId?: string;
    jurisdictionId?: string;
    action: string;
    outcome: string;
    authorityEvaluationRecordId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.AUTHORITY_EVALUATION,
      actorIdentityId: input.identityId,
      institutionId: input.institutionId,
      jurisdictionId: input.jurisdictionId,
      action: input.action,
      outcome: input.outcome,
      resourceType: 'AuthorityEvaluationRecord',
      resourceId: input.recordId,
      authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      metadata: input.metadata,
      sourceDomainEventType: 'AuthorityEvaluationRecord',
      sourceDomainEventId: input.recordId,
    });
  }

  async recordIssuance(input: {
    issuanceEventId: string;
    issuerIdentityId: string;
    institutionId?: string;
    authorityEvaluationRecordId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.ISSUANCE,
      actorIdentityId: input.issuerIdentityId,
      institutionId: input.institutionId,
      action: 'ISSUE_INSTRUMENT',
      outcome: 'COMPLETED',
      resourceType: 'IssuanceEvent',
      resourceId: input.issuanceEventId,
      authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      metadata: input.metadata,
      sourceDomainEventType: 'IssuanceEvent',
      sourceDomainEventId: input.issuanceEventId,
    });
  }

  async recordGovernedConfigurationEvent(input: {
    changeId: string;
    institutionId: string;
    jurisdictionId: string;
    actorIdentityId: string;
    action: string;
    outcome: string;
    priorStateHash?: string;
    newStateHash?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.GOVERNED_CONFIGURATION,
      actorIdentityId: input.actorIdentityId,
      institutionId: input.institutionId,
      jurisdictionId: input.jurisdictionId,
      action: input.action,
      outcome: input.outcome,
      resourceType: 'GovernedConfigurationChange',
      resourceId: input.changeId,
      priorStateHash: input.priorStateHash,
      newStateHash: input.newStateHash,
      metadata: input.metadata,
      sourceDomainEventType: 'GovernedConfigurationChange',
      sourceDomainEventId: `${input.changeId}:${input.action}`,
    });
  }
}
