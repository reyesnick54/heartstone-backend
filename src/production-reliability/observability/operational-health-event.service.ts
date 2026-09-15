import { Injectable } from '@nestjs/common';
import {
  DependencyHealthState,
  DependencyType,
  OperationalHealthEventType,
  TechnicalHealthState,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorrelationIdService } from '../common/correlation-id.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { RELIABILITY_NUMBER_PREFIXES } from '../production-reliability.constants';

export interface RecordHealthEventInput {
  eventType: OperationalHealthEventType;
  technicalHealthState: TechnicalHealthState;
  summary: string;
  dependencyType?: DependencyType;
  dependencyReference?: string;
  dependencyHealthState?: DependencyHealthState;
  isStaleIntegration?: boolean;
  affectedCapabilityRef?: string;
}

@Injectable()
export class OperationalHealthEventService {
  private eventCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReliabilityBoundaryService,
    private readonly correlationIdService: CorrelationIdService,
  ) {}

  async recordEvent(input: RecordHealthEventInput) {
    this.boundary.assertTechnicalHealthNotInstitutionalAcceptance(false);
    this.boundary.assertStaleIntegrationSurfaced(input.isStaleIntegration ?? false, true);

    if (input.dependencyHealthState === DependencyHealthState.UNAVAILABLE && input.dependencyType) {
      this.boundary.assertDependencyOutageIsolated(
        input.dependencyReference ?? input.dependencyType,
        [],
        input.dependencyType,
      );
    }

    this.eventCounter += 1;
    const eventNumber = `${RELIABILITY_NUMBER_PREFIXES.HEALTH_EVENT}-${String(this.eventCounter).padStart(6, '0')}`;
    const correlationId = this.correlationIdService.getCorrelationId();

    return this.prisma.operationalHealthEvent.create({
      data: {
        eventNumber,
        eventType: input.eventType,
        technicalHealthState: input.technicalHealthState,
        dependencyType: input.dependencyType,
        dependencyReference: input.dependencyReference,
        dependencyHealthState: input.dependencyHealthState,
        isStaleIntegration: input.isStaleIntegration ?? false,
        affectedCapabilityRef: input.affectedCapabilityRef,
        summary: input.summary,
        notInstitutionalStatus: true,
        correlationId,
      },
    });
  }
}
