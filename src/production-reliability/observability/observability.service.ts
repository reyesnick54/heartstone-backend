import { Injectable } from '@nestjs/common';
import { LogClassification, ObservabilitySignalType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';

export interface CreateSignalDefinitionInput {
  reliabilityDefinitionId: string;
  code: string;
  name: string;
  signalType: ObservabilitySignalType;
  logClassification?: LogClassification;
  redactionPolicy?: string[];
  correlationPropagation?: boolean;
  metricName?: string;
  traceSpanName?: string;
}

@Injectable()
export class ObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReliabilityBoundaryService,
  ) {}

  async createSignalDefinition(input: CreateSignalDefinitionInput) {
    return this.prisma.observabilitySignalDefinition.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        code: input.code,
        name: input.name,
        signalType: input.signalType,
        logClassification: input.logClassification ?? LogClassification.OPERATIONAL,
        redactionPolicy: input.redactionPolicy ?? [],
        correlationPropagation: input.correlationPropagation ?? true,
        metricName: input.metricName,
        traceSpanName: input.traceSpanName,
      },
    });
  }

  redactStructuredLog(payload: Record<string, unknown>): Record<string, unknown> {
    return this.boundary.redactLogPayload(payload);
  }

  sanitizeTrace(
    payload: Record<string, unknown>,
    classification: LogClassification,
  ): Record<string, unknown> {
    return this.boundary.sanitizeTracePayload(payload, classification);
  }

  assertCaseIsolation(requestingCaseRef?: string, exposedCaseRef?: string): void {
    this.boundary.assertObservabilityCaseIsolation(requestingCaseRef, exposedCaseRef);
  }
}
