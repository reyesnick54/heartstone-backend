import { Injectable } from '@nestjs/common';
import {
  CapacityAssessmentStatus,
  CapacityProfileStatus,
  ResourceSaturationLevel,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorrelationIdService } from '../common/correlation-id.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { RELIABILITY_NUMBER_PREFIXES } from '../production-reliability.constants';

export interface CreateCapacityProfileInput {
  reliabilityDefinitionId: string;
  code: string;
  name: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  expectedUsers?: number;
  concurrentSessions?: number;
  requestsPerMinute?: number;
  caseVolumePerDay?: number;
  documentVolumePerDay?: number;
  storageBytes?: bigint;
  integrationThroughput?: number;
  notificationThroughput?: number;
  paymentThroughput?: number;
  aiWorkloadUnits?: number;
}

export interface RecordSaturationInput {
  profileId: string;
  resourceType: string;
  saturationLevel: ResourceSaturationLevel;
  utilizationPercent: number;
  notes?: string;
}

@Injectable()
export class CapacityService {
  private assessmentCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReliabilityBoundaryService,
    private readonly correlationIdService: CorrelationIdService,
  ) {}

  async createProfile(input: CreateCapacityProfileInput) {
    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.capacityProfile.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        code: input.code,
        name: input.name,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        expectedUsers: input.expectedUsers,
        concurrentSessions: input.concurrentSessions,
        requestsPerMinute: input.requestsPerMinute,
        caseVolumePerDay: input.caseVolumePerDay,
        documentVolumePerDay: input.documentVolumePerDay,
        storageBytes: input.storageBytes,
        integrationThroughput: input.integrationThroughput,
        notificationThroughput: input.notificationThroughput,
        paymentThroughput: input.paymentThroughput,
        aiWorkloadUnits: input.aiWorkloadUnits,
        status: CapacityProfileStatus.DRAFT,
        correlationId,
      },
    });
  }

  async recordSaturation(input: RecordSaturationInput) {
    const safeFailTriggered =
      input.saturationLevel === ResourceSaturationLevel.EXHAUSTED ||
      input.saturationLevel === ResourceSaturationLevel.CRITICAL;

    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.resourceSaturationRecord.create({
      data: {
        profileId: input.profileId,
        resourceType: input.resourceType,
        saturationLevel: input.saturationLevel,
        utilizationPercent: input.utilizationPercent,
        safeFailTriggered,
        notes: input.notes,
        correlationId,
      },
    });
  }

  async createAssessment(profileId: string, findings: string, headroomPercent?: number) {
    const exhaustionRisk = headroomPercent !== undefined && headroomPercent < 5;
    const safeFailApplied = exhaustionRisk;

    this.boundary.assertCapacityExhaustionSafeFail(safeFailApplied, exhaustionRisk);

    this.assessmentCounter += 1;
    const assessmentNumber = `${RELIABILITY_NUMBER_PREFIXES.CAPACITY_ASSESSMENT}-${String(this.assessmentCounter).padStart(6, '0')}`;
    const correlationId = this.correlationIdService.getCorrelationId();

    return this.prisma.capacityAssessment.create({
      data: {
        profileId,
        assessmentNumber,
        findings,
        headroomPercent,
        exhaustionRisk,
        safeFailApplied,
        status: CapacityAssessmentStatus.DRAFT,
        correlationId,
      },
    });
  }
}
