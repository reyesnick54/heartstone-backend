import { Injectable } from '@nestjs/common';
import { AuthorityEvaluationRecord, AuthorityEvaluationResult } from '@prisma/client';

import { AuthorityExplanationKind } from '../common/authority.constants';
import {
  ConditionEvaluation,
  DependencyOutcome,
  GoverningSourceReference,
  StructuredExplanation,
  StructuredExplanationItem,
} from '../common/authority.types';
import { AuthorityEvaluationRecordRepository } from '../evaluation/authority-evaluation-record.repository';

@Injectable()
export class AuthorityExplanationService {
  constructor(private readonly records: AuthorityEvaluationRecordRepository) {}

  async explainEvaluation(evaluationId: string): Promise<StructuredExplanation> {
    const record = await this.records.findById(evaluationId);
    return this.buildExplanation(record);
  }

  buildExplanation(record: AuthorityEvaluationRecord): StructuredExplanation {
    const items: StructuredExplanationItem[] = [];

    items.push({
      kind: AuthorityExplanationKind.FACT,
      code: 'EVALUATION_ID',
      statement: `Evaluation ${record.id} occurred at ${record.evaluatedAt.toISOString()}.`,
      reference: record.id,
    });

    if (record.actorIdentityId) {
      items.push({
        kind: AuthorityExplanationKind.FACT,
        code: 'ACTOR_IDENTITY',
        statement: `Actor identity ${record.actorIdentityId} initiated the evaluation.`,
        reference: record.actorIdentityId,
      });
    }

    if (record.officeholderId) {
      items.push({
        kind: AuthorityExplanationKind.FACT,
        code: 'OFFICEHOLDER',
        statement: `Officeholder ${record.officeholderId} was evaluated.`,
        reference: record.officeholderId,
      });
    }

    items.push({
      kind: AuthorityExplanationKind.FACT,
      code: 'REQUESTED_ACTION',
      statement: `Requested action: ${record.requestedAction}.`,
    });

    const governingSourceRefs = record.governingSourceRefs as unknown as GoverningSourceReference[];
    for (const sourceRef of governingSourceRefs) {
      items.push({
        kind: AuthorityExplanationKind.SOURCE,
        code: 'GOVERNING_SOURCE',
        statement: `Governing source ${sourceRef.code} version ${sourceRef.version} had status ${sourceRef.status}.`,
        reference: sourceRef.sourceId,
      });
    }

    const conditions = record.conditionsEvaluated as unknown as ConditionEvaluation[];
    for (const condition of conditions) {
      items.push({
        kind: condition.satisfied ? AuthorityExplanationKind.CONDITION : AuthorityExplanationKind.FAILURE,
        code: condition.code,
        statement: `${condition.description}: ${condition.satisfied ? 'satisfied' : 'not satisfied'}.`,
      });
    }

    const dependencies = record.dependencyOutcomes as unknown as DependencyOutcome[];
    for (const dependency of dependencies) {
      items.push({
        kind: dependency.satisfied ? AuthorityExplanationKind.DEPENDENCY : AuthorityExplanationKind.FAILURE,
        code: dependency.code,
        statement: `${dependency.description}: ${dependency.satisfied ? 'satisfied' : 'not satisfied'}.`,
      });
      if (!dependency.satisfied && dependency.mandatory) {
        items.push({
          kind: AuthorityExplanationKind.UNRESOLVED_ITEM,
          code: `${dependency.code}_UNRESOLVED`,
          statement: `Mandatory dependency ${dependency.code} remains unresolved.`,
        });
      }
    }

    for (const reasonCode of record.reasonCodes) {
      items.push({
        kind: AuthorityExplanationKind.FAILURE,
        code: reasonCode,
        statement: `Reason code recorded: ${reasonCode}.`,
      });
    }

    items.push({
      kind: AuthorityExplanationKind.RESULT,
      code: record.result,
      statement: this.resultStatement(record.result, record.reasonCodes),
    });

    return {
      evaluationId: record.id,
      result: record.result,
      items,
    };
  }

  private resultStatement(result: AuthorityEvaluationResult, reasonCodes: string[]): string {
    if (result === AuthorityEvaluationResult.SAFE_HALT) {
      return `Evaluation halted for operational escalation. Reason codes: ${reasonCodes.join(', ')}.`;
    }
    if (result === AuthorityEvaluationResult.ALLOWED) {
      return 'Authority was allowed under the recorded governing sources and conditions.';
    }
    return `Authority was not authorized. Reason codes: ${reasonCodes.join(', ')}.`;
  }
}
