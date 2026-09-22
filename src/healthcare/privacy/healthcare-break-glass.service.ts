import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  HealthcareAccessAuditEventType,
  HealthcareAccessDecision,
  HealthcareBreakGlassSessionStatus,
  HealthcareDataAccessPurpose,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { HEALTHCARE_REASON_CODES } from '../healthcare.constants';
import { HealthcareAccessAuditService } from './healthcare-access-audit.service';

export interface ActivateBreakGlassInput {
  actorIdentityId: string;
  patientHealthIdentityId: string;
  reasonSummary?: string;
  policyBasisReference: string;
  resourceScope?: Record<string, unknown>;
  expiresAt: Date;
  sessionReference: string;
}

@Injectable()
export class HealthcareBreakGlassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessAudit: HealthcareAccessAuditService,
  ) {}

  assertReasonProvided(reasonSummary?: string): void {
    if (!reasonSummary || reasonSummary.trim().length < 8) {
      throw new BadRequestException({
        message: 'Break-glass access requires an explicit reason',
        code: HEALTHCARE_REASON_CODES.BREAK_GLASS_REASON_REQUIRED,
      });
    }
  }

  assertSessionActive(session: {
    status: HealthcareBreakGlassSessionStatus;
    expiresAt: Date;
    now?: Date;
  }): void {
    const now = session.now ?? new Date();
    if (session.status !== HealthcareBreakGlassSessionStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Break-glass session is not active',
        code: HEALTHCARE_REASON_CODES.BREAK_GLASS_EXPIRED,
      });
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      throw new ForbiddenException({
        message: 'Break-glass access has expired',
        code: HEALTHCARE_REASON_CODES.BREAK_GLASS_EXPIRED,
      });
    }
  }

  async activateSession(input: ActivateBreakGlassInput) {
    this.assertReasonProvided(input.reasonSummary);

    const session = await this.prisma.healthcareBreakGlassAccessSession.create({
      data: {
        sessionReference: input.sessionReference,
        actorIdentityId: input.actorIdentityId,
        patientHealthIdentityId: input.patientHealthIdentityId,
        reasonSummary: input.reasonSummary?.trim() ?? '',
        policyBasisReference: input.policyBasisReference,
        resourceScope: (input.resourceScope ?? {}) as Prisma.InputJsonValue,
        expiresAt: input.expiresAt,
        status: HealthcareBreakGlassSessionStatus.ACTIVE,
        requiresPostAccessReview: true,
      },
    });

    await this.accessAudit.record({
      eventType: HealthcareAccessAuditEventType.BREAK_GLASS_ACTIVATED,
      decision: HealthcareAccessDecision.ALLOW,
      actorIdentityId: input.actorIdentityId,
      patientHealthIdentityId: input.patientHealthIdentityId,
      accessPurpose: HealthcareDataAccessPurpose.EMERGENCY_BREAK_GLASS,
      breakGlassSessionId: session.id,
      metadata: {
        reasonSummary: input.reasonSummary,
        expiresAt: input.expiresAt.toISOString(),
        enhancedAudit: true,
      },
    });

    return session;
  }

  async assertMayUseBreakGlassSession(
    sessionId: string,
    actorIdentityId: string,
    now = new Date(),
  ) {
    const session = await this.prisma.healthcareBreakGlassAccessSession.findUnique({
      where: { id: sessionId },
    });

    if (session?.actorIdentityId !== actorIdentityId) {
      throw new ForbiddenException('Break-glass session not found for actor');
    }

    this.assertSessionActive({
      status: session.status,
      expiresAt: session.expiresAt,
      now,
    });

    await this.accessAudit.record({
      eventType: HealthcareAccessAuditEventType.BREAK_GLASS_READ,
      decision: HealthcareAccessDecision.ALLOW,
      actorIdentityId,
      patientHealthIdentityId: session.patientHealthIdentityId,
      accessPurpose: HealthcareDataAccessPurpose.EMERGENCY_BREAK_GLASS,
      breakGlassSessionId: session.id,
      metadata: { enhancedAudit: true, postAccessReviewRequired: session.requiresPostAccessReview },
    });

    return session;
  }

  async expireElapsedSessions(now = new Date()): Promise<number> {
    const result = await this.prisma.healthcareBreakGlassAccessSession.updateMany({
      where: {
        status: HealthcareBreakGlassSessionStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: {
        status: HealthcareBreakGlassSessionStatus.EXPIRED,
      },
    });

    return result.count;
  }
}
