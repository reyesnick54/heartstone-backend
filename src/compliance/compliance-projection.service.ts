import { Injectable } from '@nestjs/common';
import {
  ComplianceAlertSeverity,
  ComplianceAssessmentOutcome,
  ComplianceMonitoringEventType,
  ComplianceProjectionStatus,
  ComplianceRevalidationOutcome,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface ProjectComplianceStatusInput {
  complianceMatterId?: string;
  officialInstrumentId?: string;
  projectedStatus: ComplianceProjectionStatus;
  basisSummary: string;
}

export interface RecordAssessmentInput {
  complianceMatterId: string;
  assessorIdentityId: string;
  assessorOfficeholderId: string;
  outcome: ComplianceAssessmentOutcome;
  summary: string;
}

@Injectable()
export class ComplianceProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async projectStatus(input: ProjectComplianceStatusInput) {
    const projection = await this.prisma.complianceStatusProjection.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        officialInstrumentId: input.officialInstrumentId,
        projectedStatus: input.projectedStatus,
        basisSummary: input.basisSummary,
      },
    });

    await this.recordMonitoringEvent({
      complianceMatterId: input.complianceMatterId,
      eventType: ComplianceMonitoringEventType.PROJECTION_UPDATED,
      metadata: { projectedStatus: input.projectedStatus },
    });

    return projection;
  }

  async recordAssessment(input: RecordAssessmentInput) {
    return this.prisma.complianceAssessment.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        outcome: input.outcome,
        summary: input.summary,
      },
    });
  }

  async raiseAlert(input: {
    complianceMatterId?: string;
    alertType: string;
    severity: ComplianceAlertSeverity;
    message: string;
  }) {
    const alert = await this.prisma.complianceAlert.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        alertType: input.alertType,
        severity: input.severity,
        message: input.message,
      },
    });

    await this.recordMonitoringEvent({
      complianceMatterId: input.complianceMatterId,
      eventType: ComplianceMonitoringEventType.ALERT_RAISED,
      metadata: { alertType: input.alertType, severity: input.severity },
    });

    return alert;
  }

  async revalidate(input: {
    complianceMatterId?: string;
    officialInstrumentId?: string;
    outcome: ComplianceRevalidationOutcome;
    revalidatedByIdentityId: string;
    revalidatedByOfficeholderId: string;
    notes?: string;
  }) {
    return this.prisma.complianceRevalidationRecord.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        officialInstrumentId: input.officialInstrumentId,
        outcome: input.outcome,
        revalidatedByIdentityId: input.revalidatedByIdentityId,
        revalidatedByOfficeholderId: input.revalidatedByOfficeholderId,
        notes: input.notes,
      },
    });
  }

  async recordMonitoringEvent(input: {
    complianceMatterId?: string;
    eventType: ComplianceMonitoringEventType;
    metadata?: Record<string, unknown>;
    actorIdentityId?: string;
  }) {
    return this.prisma.complianceMonitoringEvent.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        eventType: input.eventType,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        actorIdentityId: input.actorIdentityId,
      },
    });
  }
}
