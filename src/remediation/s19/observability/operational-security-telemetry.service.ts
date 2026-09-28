import { Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditEventType } from '@prisma/client';

import { SecurityAuditService } from '../../../identity/audit/security-audit.service';

@Injectable()
export class OperationalSecurityTelemetryService {
  constructor(private readonly securityAudit: SecurityAuditService) {}

  recordAuthenticationFailure(input: { identityId?: string; metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.AUTHENTICATION_FAILURE,
      identityId: input.identityId,
      metadata: input.metadata,
    });
  }

  recordAuthorizationDenial(input: { identityId?: string; metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.SCOPE_ACCESS_DENIED,
      identityId: input.identityId,
      metadata: input.metadata,
    });
  }

  recordAuthorityDenial(input: { identityId?: string; metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.AUTHORITY_EVALUATION_DENIED,
      identityId: input.identityId,
      metadata: input.metadata,
    });
  }

  recordSuspiciousRecordAccess(input: { identityId?: string; metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.SUSPICIOUS_RECORD_ACCESS_ATTEMPT,
      identityId: input.identityId,
      metadata: input.metadata,
    });
  }

  recordIntegrationAuthenticationFailure(input: { metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.INTEGRATION_AUTHENTICATION_FAILURE,
      metadata: input.metadata,
    });
  }

  recordOperationalProviderMisconfiguration(input: { metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.OPERATIONAL_PROVIDER_MISCONFIGURATION,
      metadata: input.metadata,
    });
  }

  recordRepeatedWebhookFailure(input: { metadata?: Prisma.InputJsonValue }) {
    return this.securityAudit.record({
      eventType: SecurityAuditEventType.PAYMENT_WEBHOOK_FAILURE,
      metadata: input.metadata,
    });
  }
}
