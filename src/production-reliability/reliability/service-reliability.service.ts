import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ServiceLevelIndicatorType,
  ServiceLevelObjectiveStatus,
  ServiceReliabilityDefinitionStatus,
  SliMeasurementStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorrelationIdService } from '../common/correlation-id.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';

export interface CreateReliabilityDefinitionInput {
  code: string;
  name: string;
  serviceReference: string;
  description?: string;
}

export interface CreateSloInput {
  reliabilityDefinitionId: string;
  code: string;
  name: string;
  approvedTargetValue: string;
  approvedTargetUnit: string;
  approvedTargetReference: string;
  evaluationWindow: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface CreateSliInput {
  objectiveId: string;
  code: string;
  name: string;
  indicatorType: ServiceLevelIndicatorType;
  measurementUnit: string;
  approvedThreshold: string;
  approvedThresholdRef: string;
}

export interface RecordAvailabilityInput {
  objectiveId: string;
  indicatorId: string;
  measuredValue: string;
  windowStart: Date;
  windowEnd: Date;
  isHttp200Only?: boolean;
  notes?: string;
}

export interface RecordLatencyInput {
  objectiveId: string;
  indicatorId: string;
  measuredValueMs: number;
  windowStart: Date;
  windowEnd: Date;
  percentile?: string;
  notes?: string;
}

@Injectable()
export class ServiceReliabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReliabilityBoundaryService,
    private readonly correlationIdService: CorrelationIdService,
  ) {}

  async createDefinition(input: CreateReliabilityDefinitionInput) {
    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.serviceReliabilityDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        serviceReference: input.serviceReference,
        description: input.description,
        status: ServiceReliabilityDefinitionStatus.DRAFT,
        correlationId,
      },
    });
  }

  async createObjective(input: CreateSloInput) {
    this.boundary.assertApprovedTargetReference(input.approvedTargetReference);
    this.boundary.assertNotInventedSla(input.approvedTargetValue, input.approvedTargetReference);

    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.serviceLevelObjective.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        code: input.code,
        name: input.name,
        approvedTargetValue: input.approvedTargetValue,
        approvedTargetUnit: input.approvedTargetUnit,
        approvedTargetReference: input.approvedTargetReference,
        evaluationWindow: input.evaluationWindow,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        status: ServiceLevelObjectiveStatus.DRAFT,
        correlationId,
      },
    });
  }

  async approveObjective(objectiveId: string) {
    const objective = await this.prisma.serviceLevelObjective.findUniqueOrThrow({
      where: { id: objectiveId },
    });
    this.boundary.assertApprovedTargetReference(objective.approvedTargetReference);

    return this.prisma.serviceLevelObjective.update({
      where: { id: objectiveId },
      data: { status: ServiceLevelObjectiveStatus.APPROVED },
    });
  }

  async createIndicator(input: CreateSliInput) {
    this.boundary.assertApprovedTargetReference(input.approvedThresholdRef);

    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.serviceLevelIndicator.create({
      data: {
        objectiveId: input.objectiveId,
        code: input.code,
        name: input.name,
        indicatorType: input.indicatorType,
        measurementUnit: input.measurementUnit,
        approvedThreshold: input.approvedThreshold,
        approvedThresholdRef: input.approvedThresholdRef,
        correlationId,
      },
    });
  }

  async recordAvailability(input: RecordAvailabilityInput) {
    this.boundary.assertHttp200NotGovernmentOutcome(input.isHttp200Only ?? false);

    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.availabilityMeasurement.create({
      data: {
        objectiveId: input.objectiveId,
        indicatorId: input.indicatorId,
        measuredValue: input.measuredValue,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        isHttp200Only: input.isHttp200Only ?? false,
        notes: input.notes,
        measurementStatus: SliMeasurementStatus.RECORDED,
        correlationId,
      },
    });
  }

  async recordLatency(input: RecordLatencyInput) {
    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.latencyMeasurement.create({
      data: {
        objectiveId: input.objectiveId,
        indicatorId: input.indicatorId,
        measuredValueMs: input.measuredValueMs,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        percentile: input.percentile,
        notes: input.notes,
        measurementStatus: SliMeasurementStatus.RECORDED,
        correlationId,
      },
    });
  }

  async evaluateSloViolation(objectiveId: string, measuredValue: string): Promise<boolean> {
    const objective = await this.prisma.serviceLevelObjective.findUniqueOrThrow({
      where: { id: objectiveId },
    });

    if (
      objective.status !== ServiceLevelObjectiveStatus.ACTIVE &&
      objective.status !== ServiceLevelObjectiveStatus.APPROVED
    ) {
      throw new BadRequestException('SLO must be approved or active for evaluation');
    }

    return measuredValue !== objective.approvedTargetValue;
  }
}
