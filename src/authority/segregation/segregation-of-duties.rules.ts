import { type AuthorityEvaluationContext } from '../domain/authority-evaluation-context';
import { GovernmentActionType } from '../domain/government-action.enum';

/**
 * Canonical segregation-of-duties rule codes.
 * Generic — no institution-specific names.
 */
export enum SegregationOfDutiesRuleCode {
  APPLICANT_VS_VERIFIER = 'APPLICANT_VS_VERIFIER',
  EVIDENCE_VERIFIER_VS_BENEFICIARY = 'EVIDENCE_VERIFIER_VS_BENEFICIARY',
  REVIEWER_VS_FINAL_DECISION_MAKER = 'REVIEWER_VS_FINAL_DECISION_MAKER',
  DECISION_MAKER_VS_ISSUANCE_ADMINISTRATOR = 'DECISION_MAKER_VS_ISSUANCE_ADMINISTRATOR',
  ORIGINAL_DECISION_MAKER_VS_APPEAL_REVIEWER = 'ORIGINAL_DECISION_MAKER_VS_APPEAL_REVIEWER',
  WORKFLOW_ADMINISTRATOR_VS_SELF_APPROVAL = 'WORKFLOW_ADMINISTRATOR_VS_SELF_APPROVAL',
}

export interface SegregationOfDutiesRule {
  code: SegregationOfDutiesRuleCode;
  description: string;
  evaluate: (context: AuthorityEvaluationContext) => boolean;
}

function actorPerformedAction(
  context: AuthorityEvaluationContext,
  action: GovernmentActionType,
): boolean {
  return context.priorActions.some(
    (prior) =>
      prior.actorIdentityId === context.actor.identityId && prior.action === action,
  );
}

export const SEGREGATION_OF_DUTIES_RULES: readonly SegregationOfDutiesRule[] = [
  {
    code: SegregationOfDutiesRuleCode.APPLICANT_VS_VERIFIER,
    description: 'Actor who prepared/applied cannot verify evidence or review',
    evaluate: (context) => {
      if (
        context.requestedAction !== GovernmentActionType.REVIEW &&
        context.requestedAction !== GovernmentActionType.RECOMMEND
      ) {
        return true;
      }
      return !actorPerformedAction(context, GovernmentActionType.PREPARE);
    },
  },
  {
    code: SegregationOfDutiesRuleCode.EVIDENCE_VERIFIER_VS_BENEFICIARY,
    description: 'Evidence verifier cannot be the beneficiary of the decision',
    evaluate: (context) => {
      if (context.requestedAction !== GovernmentActionType.DECIDE) {
        return true;
      }
      const verifiedEvidence = context.priorActions.some(
        (prior) =>
          prior.actorIdentityId === context.actor.identityId &&
          prior.action === GovernmentActionType.REVIEW,
      );
      const isBeneficiary = context.approvedAttributes.some(
        (attr) => attr.key === 'beneficiaryIdentityId' && attr.value === context.actor.identityId,
      );
      return !(verifiedEvidence && isBeneficiary);
    },
  },
  {
    code: SegregationOfDutiesRuleCode.REVIEWER_VS_FINAL_DECISION_MAKER,
    description: 'Reviewer cannot be the independent final decision-maker',
    evaluate: (context) => {
      if (context.requestedAction !== GovernmentActionType.DECIDE) {
        return true;
      }
      return !actorPerformedAction(context, GovernmentActionType.REVIEW);
    },
  },
  {
    code: SegregationOfDutiesRuleCode.DECISION_MAKER_VS_ISSUANCE_ADMINISTRATOR,
    description: 'Decision-maker cannot issue the instrument',
    evaluate: (context) => {
      if (context.requestedAction !== GovernmentActionType.ISSUE) {
        return true;
      }
      return !actorPerformedAction(context, GovernmentActionType.DECIDE);
    },
  },
  {
    code: SegregationOfDutiesRuleCode.ORIGINAL_DECISION_MAKER_VS_APPEAL_REVIEWER,
    description: 'Original decision-maker cannot independently review an appeal',
    evaluate: (context) => {
      if (
        context.requestedAction !== GovernmentActionType.REVIEW ||
        !context.caseReference?.includes('APPEAL')
      ) {
        return true;
      }
      return !actorPerformedAction(context, GovernmentActionType.DECIDE);
    },
  },
  {
    code: SegregationOfDutiesRuleCode.WORKFLOW_ADMINISTRATOR_VS_SELF_APPROVAL,
    description: 'Workflow administrator cannot self-approve or self-activate',
    evaluate: (context) => {
      const isSelfApprovalAction =
        context.requestedAction === GovernmentActionType.DECIDE ||
        context.requestedAction === GovernmentActionType.SIGN;
      if (!isSelfApprovalAction) {
        return true;
      }
      const isWorkflowAdmin = context.approvedAttributes.some(
        (attr) =>
          attr.key === 'workflowAdministratorIdentityId' &&
          attr.value === context.actor.identityId,
      );
      const selfApproval = context.approvedAttributes.some(
        (attr) =>
          attr.key === 'subjectIdentityId' && attr.value === context.actor.identityId,
      );
      return !(isWorkflowAdmin && selfApproval);
    },
  },
];

export function getSegregationRule(
  code: SegregationOfDutiesRuleCode,
): SegregationOfDutiesRule | undefined {
  return SEGREGATION_OF_DUTIES_RULES.find((rule) => rule.code === code);
}
