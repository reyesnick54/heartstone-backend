import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ProtectedRedactedElement {
  field: string;
  basis: string;
  redactedValue?: string;
}

export interface CreateAutomationExplanationInput {
  automationUsed: boolean;
  approvedPurpose: string;
  systemIdentifier: string;
  modelIdentifier?: string;
  version: string;
  materialInputs: Record<string, unknown>;
  output: Record<string, unknown>;
  workflowRole: string;
  limitations?: string;
  humanReviewerIdentityId?: string;
  finalDecisionMakerIdentityId?: string;
  dataSourceReferences?: string[];
  rerunAvailable?: boolean;
  exclusionAvailable?: boolean;
  correctionRouteReference?: string;
  reconsiderationRouteReference?: string;
  protectedRedactedElements?: ProtectedRedactedElement[];
  explanationSummary?: string;
  securityAuditEventId?: string;
}

export interface PublicExplanationView {
  explanationSummary: string;
  systemIdentifier: string;
  modelIdentifier?: string;
  version: string;
  workflowRole: string;
  materialInputs: Record<string, unknown>;
  output: Record<string, unknown>;
  limitations?: string;
  rerunAvailable: boolean;
  exclusionAvailable: boolean;
  correctionRouteReference?: string;
  reconsiderationRouteReference?: string;
  protectedRedactedElements: ProtectedRedactedElement[];
}

@Injectable()
export class AutomationExplanationService {
  constructor(private readonly prisma: PrismaService) {}

  async createExplanation(input: CreateAutomationExplanationInput) {
    const redactedElements = input.protectedRedactedElements ?? [];
    const sanitizedInputs = this.applyRedactions(input.materialInputs, redactedElements);
    const sanitizedOutput = this.applyRedactions(input.output, redactedElements);
    const summary =
      input.explanationSummary ??
      this.buildMandatorySummary({
        systemIdentifier: input.systemIdentifier,
        modelIdentifier: input.modelIdentifier,
        version: input.version,
        workflowRole: input.workflowRole,
        approvedPurpose: input.approvedPurpose,
        redactedCount: redactedElements.length,
      });

    if (!summary.trim()) {
      throw new BadRequestException(
        'Security or model confidentiality cannot justify zero explanation',
      );
    }

    return this.prisma.automationExplanationRecord.create({
      data: {
        automationUsed: input.automationUsed,
        approvedPurpose: input.approvedPurpose,
        systemIdentifier: input.systemIdentifier,
        modelIdentifier: input.modelIdentifier,
        version: input.version,
        materialInputs: sanitizedInputs as Prisma.InputJsonValue,
        output: sanitizedOutput as Prisma.InputJsonValue,
        workflowRole: input.workflowRole,
        limitations: input.limitations,
        humanReviewerIdentityId: input.humanReviewerIdentityId,
        finalDecisionMakerIdentityId: input.finalDecisionMakerIdentityId,
        dataSourceReferences: input.dataSourceReferences ?? [],
        rerunAvailable: input.rerunAvailable ?? false,
        exclusionAvailable: input.exclusionAvailable ?? false,
        correctionRouteReference: input.correctionRouteReference,
        reconsiderationRouteReference: input.reconsiderationRouteReference,
        protectedRedactedElements: redactedElements as unknown as Prisma.InputJsonValue,
        explanationSummary: summary,
        securityAuditEventId: input.securityAuditEventId,
      },
    });
  }

  buildPublicView(record: {
    explanationSummary: string;
    systemIdentifier: string;
    modelIdentifier: string | null;
    version: string;
    workflowRole: string;
    materialInputs: unknown;
    output: unknown;
    limitations: string | null;
    rerunAvailable: boolean;
    exclusionAvailable: boolean;
    correctionRouteReference: string | null;
    reconsiderationRouteReference: string | null;
    protectedRedactedElements: unknown;
  }): PublicExplanationView {
    const redactedElements = (record.protectedRedactedElements ?? []) as ProtectedRedactedElement[];

    return {
      explanationSummary: record.explanationSummary,
      systemIdentifier: record.systemIdentifier,
      modelIdentifier: record.modelIdentifier ?? undefined,
      version: record.version,
      workflowRole: record.workflowRole,
      materialInputs: record.materialInputs as Record<string, unknown>,
      output: record.output as Record<string, unknown>,
      limitations: record.limitations ?? undefined,
      rerunAvailable: record.rerunAvailable,
      exclusionAvailable: record.exclusionAvailable,
      correctionRouteReference: record.correctionRouteReference ?? undefined,
      reconsiderationRouteReference: record.reconsiderationRouteReference ?? undefined,
      protectedRedactedElements: redactedElements,
    };
  }

  private applyRedactions(
    payload: Record<string, unknown>,
    redactedElements: ProtectedRedactedElement[],
  ): Record<string, unknown> {
    const result = { ...payload };

    for (const element of redactedElements) {
      if (element.field in result) {
        result[element.field] = '[REDACTED]';
      }
    }

    return result;
  }

  private buildMandatorySummary(input: {
    systemIdentifier: string;
    modelIdentifier?: string;
    version: string;
    workflowRole: string;
    approvedPurpose: string;
    redactedCount: number;
  }): string {
    const modelPart = input.modelIdentifier ? ` using model ${input.modelIdentifier}` : '';
    const redactionPart =
      input.redactedCount > 0
        ? ` ${String(input.redactedCount)} protected element(s) were redacted with documented basis.`
        : '';

    return (
      `Automation system ${input.systemIdentifier}${modelPart} (version ${input.version}) ` +
      `performed the role "${input.workflowRole}" for approved purpose: ${input.approvedPurpose}.` +
      redactionPart
    );
  }
}
