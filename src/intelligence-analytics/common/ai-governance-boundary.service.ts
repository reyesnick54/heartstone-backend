import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AIRiskClass, IdentityType } from '@prisma/client';

import {
  AI_GOVERNANCE_REASON_CODES,
  FABRICATED_AUTHORITY_PATTERNS,
  FORBIDDEN_AI_AGENT_DEFINITION_CLIENT_FIELDS,
  FORBIDDEN_AI_EXECUTION_CLIENT_FIELDS,
  FORBIDDEN_AI_GOVERNMENT_ACTIONS,
  FORBIDDEN_AI_MODEL_DEFINITION_CLIENT_FIELDS,
  FORBIDDEN_AI_USE_CASE_CLIENT_FIELDS,
  PROMPT_INJECTION_PATTERNS,
  SECRET_LOG_PATTERNS,
} from '../intelligence-analytics.constants';

@Injectable()
export class AiGovernanceBoundaryService {
  rejectForbiddenUseCaseFields(payload: Record<string, unknown>): void {
    this.rejectFields(payload, FORBIDDEN_AI_USE_CASE_CLIENT_FIELDS, 'AI use case');
  }

  rejectForbiddenModelDefinitionFields(payload: Record<string, unknown>): void {
    this.rejectFields(payload, FORBIDDEN_AI_MODEL_DEFINITION_CLIENT_FIELDS, 'AI model definition');
  }

  rejectForbiddenAgentDefinitionFields(payload: Record<string, unknown>): void {
    this.rejectFields(payload, FORBIDDEN_AI_AGENT_DEFINITION_CLIENT_FIELDS, 'AI agent definition');
  }

  rejectForbiddenExecutionFields(payload: Record<string, unknown>): void {
    this.rejectFields(payload, FORBIDDEN_AI_EXECUTION_CLIENT_FIELDS, 'AI execution record');
  }

  assertAutonomousFinalDecisionForbidden(allowsAutonomousFinalDecision: boolean): void {
    if (allowsAutonomousFinalDecision) {
      throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.AUTONOMOUS_FINAL_DECISION_FORBIDDEN);
    }
  }

  assertUseCaseRiskClassPermitted(riskClass: AIRiskClass): void {
    if (riskClass === AIRiskClass.PROHIBITED) {
      throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.PROHIBITED_USE_CASE);
    }
  }

  assertAiActorCannotPerformGovernmentAction(
    actorType: IdentityType,
    requestedAction: string,
  ): void {
    if (actorType !== IdentityType.SERVICE) {
      return;
    }

    const normalized = requestedAction.toUpperCase();
    if (
      FORBIDDEN_AI_GOVERNMENT_ACTIONS.includes(
        normalized as (typeof FORBIDDEN_AI_GOVERNMENT_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.GOVERNMENT_ACTION_FORBIDDEN);
    }
  }

  assertAiCannotApproveOrRefuse(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'APPROVE');
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'REFUSE');
  }

  assertAiCannotSign(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'SIGN');
  }

  assertAiCannotIssue(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'ISSUE');
  }

  assertAiCannotHearAppeal(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'HEAR_APPEAL');
  }

  assertAiCannotWaive(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'WAIVE');
  }

  assertAiCannotAuthorizeExpenditure(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'AUTHORIZE_EXPENDITURE');
  }

  assertAiCannotInitiateEnforcement(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'INITIATE_ENFORCEMENT');
  }

  assertAiCannotAlterOfficialRecord(actorType: IdentityType): void {
    this.assertAiActorCannotPerformGovernmentAction(actorType, 'ALTER_OFFICIAL_RECORD');
  }

  assertAgentCannotExpandOwnEntitlements(
    actorAgentDefinitionId: string | null,
    targetAgentDefinitionId: string,
    requestedExpansion: boolean,
  ): void {
    if (!requestedExpansion) {
      return;
    }

    if (actorAgentDefinitionId === targetAgentDefinitionId) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.AGENT_SELF_EXPANSION_FORBIDDEN);
    }
  }

  assertPromptInjectionCannotAlterPolicy(untrustedContent: string): void {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(untrustedContent)) {
        throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.PROMPT_INJECTION_BLOCKED);
      }
    }
  }

  assertDocumentInstructionsTreatedAsContent(
    untrustedContent: string,
    policyContent: string,
  ): void {
    this.assertPromptInjectionCannotAlterPolicy(untrustedContent);

    if (
      untrustedContent.includes(policyContent) &&
      untrustedContent.length > policyContent.length
    ) {
      throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.DOCUMENT_INSTRUCTIONS_UNTRUSTED);
    }
  }

  assertCrossCaseRetrievalBlocked(
    requestedCaseReference: string,
    permittedCaseReference: string,
  ): void {
    if (requestedCaseReference !== permittedCaseReference) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.CROSS_CASE_RETRIEVAL_BLOCKED);
    }
  }

  assertDatasetEntitlementPermitted(
    datasetReference: string,
    entitledDatasets: string[],
    prohibitedDatasets: string[],
  ): void {
    if (prohibitedDatasets.includes(datasetReference)) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.PROHIBITED_DATASET_BLOCKED);
    }

    if (!entitledDatasets.includes(datasetReference)) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.ENTITLEMENT_DENIED);
    }
  }

  assertToolEntitlementPermitted(
    toolReference: string,
    entitledTools: string[],
    permittedActions: string[],
    requestedAction: string,
  ): void {
    if (!entitledTools.includes(toolReference)) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.ENTITLEMENT_DENIED);
    }

    if (!permittedActions.includes(requestedAction)) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.TOOL_ACCESS_NOT_UNIVERSAL_PERMISSION);
    }
  }

  assertNoEntitlementThroughPrompt(untrustedContent: string): void {
    if (/grant (me )?(access|permission|entitlement)/i.test(untrustedContent)) {
      throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.ENTITLEMENT_DENIED);
    }
  }

  assertSuspendedModelBlocked(isSuspended: boolean): void {
    if (isSuspended) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.MODEL_SUSPENDED);
    }
  }

  assertSuspendedUseCaseBlocked(isSuspended: boolean): void {
    if (isSuspended) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.USE_CASE_SUSPENDED);
    }
  }

  assertExpiredUseCaseBlocked(isExpired: boolean): void {
    if (isExpired) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.USE_CASE_EXPIRED);
    }
  }

  assertSuspendedAgentBlocked(isSuspended: boolean): void {
    if (isSuspended) {
      throw new ForbiddenException(AI_GOVERNANCE_REASON_CODES.AGENT_SUSPENDED);
    }
  }

  assertHighConfidenceCannotBypassEvidenceGate(
    confidenceScore: number | null | undefined,
    evidenceGateRequired: boolean,
    evidenceReferencesProvided: string[],
  ): void {
    if (!evidenceGateRequired) {
      return;
    }

    const highConfidence =
      confidenceScore !== null && confidenceScore !== undefined && confidenceScore >= 0.9;
    if (highConfidence && evidenceReferencesProvided.length === 0) {
      throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.EVIDENCE_GATE_REQUIRED);
    }
  }

  assertAiCannotFabricateAuthoritySource(outputText: string): void {
    for (const pattern of FABRICATED_AUTHORITY_PATTERNS) {
      if (pattern.test(outputText)) {
        throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.FABRICATED_AUTHORITY_BLOCKED);
      }
    }
  }

  assertAcceptanceNotGovernmentDecision(dispositionNotes: string): void {
    if (/government decision (recorded|issued|finalized)/i.test(dispositionNotes)) {
      throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.AI_RECOMMENDATION_NOT_DECISION);
    }
  }

  sanitizeExecutionLogContent(content: string): string {
    for (const pattern of SECRET_LOG_PATTERNS) {
      if (pattern.test(content)) {
        throw new BadRequestException(AI_GOVERNANCE_REASON_CODES.SECRET_IN_LOG_FORBIDDEN);
      }
    }

    return content;
  }

  assertExecutionRequiresRecordedModelVersion(modelVersionId: string | null | undefined): void {
    if (!modelVersionId) {
      throw new BadRequestException('Model version must be recorded for every AI execution');
    }
  }

  assertHumanDispositionRequiredForAssistiveAcceptance(
    dispositionRecorded: boolean,
    acceptingForAssistiveUse: boolean,
  ): void {
    if (acceptingForAssistiveUse && !dispositionRecorded) {
      throw new BadRequestException(
        'Human disposition must be recorded before assistive acceptance',
      );
    }
  }

  private rejectFields(
    payload: Record<string, unknown>,
    forbiddenFields: readonly string[],
    context: string,
  ): void {
    for (const field of forbiddenFields) {
      if (field in payload) {
        throw new BadRequestException(`Client cannot set ${field} on ${context}`);
      }
    }
  }
}
