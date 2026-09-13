import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MasterAdministrativeFileSecurityClassification,
  RecordAccessEvent,
  RecordAccessEventType,
  RecordAccessResult,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';

export interface RecordAccessInput {
  recordType: string;
  recordId: string;
  accessType: RecordAccessEventType;
  identityId?: string;
  officeholderId?: string;
  purpose: string;
  result: RecordAccessResult;
  correlationId?: string;
  classification?: MasterAdministrativeFileSecurityClassification;
}

@Injectable()
export class RecordAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async recordAccess(input: RecordAccessInput): Promise<RecordAccessEvent> {
    const isRestricted =
      input.classification === MasterAdministrativeFileSecurityClassification.RESTRICTED ||
      input.classification === MasterAdministrativeFileSecurityClassification.SECRET;

    let securityAuditEventId: string | undefined;

    if (isRestricted || input.accessType === RecordAccessEventType.EXPORT) {
      const auditEvent = await this.securityAudit.record({
        eventType: SecurityAuditEventType.PROTECTED_ENDPOINT_ACCESS,
        identityId: input.identityId,
        actorIdentityId: input.identityId,
        metadata: {
          recordAccessType: input.accessType,
          recordType: input.recordType,
          recordId: input.recordId,
          purpose: input.purpose,
          result: input.result,
          correlationId: input.correlationId,
          domain: 'evidence-record-access',
        },
      });
      securityAuditEventId = auditEvent.id;
    }

    return this.prisma.recordAccessEvent.create({
      data: {
        recordType: input.recordType,
        recordId: input.recordId,
        accessType: input.accessType,
        identityId: input.identityId,
        officeholderId: input.officeholderId,
        purpose: input.purpose,
        result: input.result,
        correlationId: input.correlationId,
        securityAuditEventId,
      },
    });
  }

  updateAccessEvent(): Promise<never> {
    return Promise.reject(
      new BadRequestException('Record access events are append-only and cannot be updated'),
    );
  }

  deleteAccessEvent(): Promise<never> {
    return Promise.reject(
      new BadRequestException('Record access events are append-only and cannot be deleted'),
    );
  }
}
