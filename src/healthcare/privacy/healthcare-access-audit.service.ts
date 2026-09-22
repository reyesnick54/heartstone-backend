import { Injectable } from '@nestjs/common';
import {
  HealthcareAccessAuditEventType,
  HealthcareAccessDecision,
  HealthcareDataAccessPurpose,
  HealthcareDataCategory,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordHealthcareAccessAuditInput {
  eventType: HealthcareAccessAuditEventType;
  decision: HealthcareAccessDecision;
  actorIdentityId?: string;
  patientHealthIdentityId?: string;
  dataCategory?: HealthcareDataCategory;
  accessPurpose?: HealthcareDataAccessPurpose;
  policyId?: string;
  breakGlassSessionId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class HealthcareAccessAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordHealthcareAccessAuditInput) {
    return this.prisma.healthcareAccessAuditEvent.create({
      data: {
        eventType: input.eventType,
        decision: input.decision,
        actorIdentityId: input.actorIdentityId,
        patientHealthIdentityId: input.patientHealthIdentityId,
        dataCategory: input.dataCategory,
        accessPurpose: input.accessPurpose,
        policyId: input.policyId,
        breakGlassSessionId: input.breakGlassSessionId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
