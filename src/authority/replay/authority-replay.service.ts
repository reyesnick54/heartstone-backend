import { Injectable } from '@nestjs/common';

import { AuthorityReplayMode } from '../common/authority.constants';
import {
  EvaluationReplaySnapshot,
  GoverningSourceReference,
  ReplayOutcome,
} from '../common/authority.types';
import { AuthorityEvaluationService } from '../evaluation/authority-evaluation.service';
import { AuthorityEvaluationRecordRepository } from '../evaluation/authority-evaluation-record.repository';
import { AuthorityExplanationService } from '../explanation/authority-explanation.service';

@Injectable()
export class AuthorityReplayService {
  constructor(
    private readonly records: AuthorityEvaluationRecordRepository,
    private readonly evaluation: AuthorityEvaluationService,
    private readonly explanation: AuthorityExplanationService,
  ) {}

  async replay(
    evaluationId: string,
    mode: AuthorityReplayMode = AuthorityReplayMode.HISTORICAL_REPLAY,
  ): Promise<ReplayOutcome> {
    const record = await this.records.findById(evaluationId);
    const snapshot = record.replaySnapshot as unknown as EvaluationReplaySnapshot;
    const historicalResult = record.result;

    if (mode === AuthorityReplayMode.HISTORICAL_REPLAY) {
      return {
        mode,
        evaluationId,
        historicalResult,
        replayResult: historicalResult,
        differsFromHistorical: false,
        explanation: this.explanation.buildExplanation(record),
        governingSourcesConsidered: snapshot.governingSourceRefs,
      };
    }

    const reevaluation = await this.evaluation.evaluate({
      actorIdentityId: snapshot.actorIdentityId ?? undefined,
      officeholderId: snapshot.officeholderId ?? undefined,
      functionCode: snapshot.functionCode,
      requestedAction: snapshot.requestedAction,
      assignmentId: snapshot.assignmentId ?? undefined,
      appointmentId: snapshot.appointmentId ?? undefined,
      delegationId: snapshot.delegationId ?? undefined,
      evaluatedAt: new Date(),
    });

    const replayResult = reevaluation.result;
    const differsFromHistorical = replayResult !== historicalResult;

    const reevaluationRecord = await this.records.findById(reevaluation.recordId);

    return {
      mode,
      evaluationId,
      historicalResult,
      replayResult,
      differsFromHistorical,
      explanation: this.explanation.buildExplanation(reevaluationRecord),
      governingSourcesConsidered: reevaluationRecord.governingSourceRefs as unknown as GoverningSourceReference[],
    };
  }
}
