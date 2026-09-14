import { Injectable } from '@nestjs/common';

import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface DeterministicAiInput {
  inputs: Record<string, unknown>;
  executionReference: string;
}

@Injectable()
export class DeterministicAiAdapter {
  constructor(private readonly boundary: IntelligenceBoundaryService) {}

  execute(input: DeterministicAiInput): Record<string, unknown> {
    this.boundary.assertDeterministicAdapterNotDecisionEngine();
    return {
      executionReference: input.executionReference,
      recommendation: 'REVIEW_REQUIRED',
      confidence: 0,
      isBinding: false,
      disclaimer:
        'Deterministic AI adapter output is recommendatory only and does not constitute a decision.',
      inputsEcho: input.inputs,
    };
  }
}
