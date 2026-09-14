import { Injectable } from '@nestjs/common';
import {
  AnalysisRunStatus,
  DashboardIndicatorStatus,
  DigitalTwinStatus,
  MetricCalculationRunStatus,
  ReportGenerationRunStatus,
  RiskAssessmentStatus,
  SimulationRunStatus,
} from '@prisma/client';

import { STALE_TWIN_MAX_AGE_MS } from '../intelligence.constants';
import { IntelligenceBoundaryService } from './intelligence-boundary.service';

export interface SafeHaltEvaluationInput {
  indicatorStale?: boolean;
  twinStale?: boolean;
  twinStaleAt?: Date | null;
  metricCalculationStatus?: MetricCalculationRunStatus;
  analysisRunStatus?: AnalysisRunStatus;
  simulationRunStatus?: SimulationRunStatus;
  reportGenerationStatus?: ReportGenerationRunStatus;
  riskAssessmentStatus?: RiskAssessmentStatus;
  digitalTwinStatus?: DigitalTwinStatus;
  indicatorStatus?: DashboardIndicatorStatus;
  consequential?: boolean;
}

export interface SafeHaltEvaluationResult {
  safeHalted: boolean;
  reasons: string[];
}

@Injectable()
export class IntelligenceSafeHaltService {
  constructor(private readonly boundary: IntelligenceBoundaryService) {}

  evaluate(input: SafeHaltEvaluationInput): SafeHaltEvaluationResult {
    const reasons: string[] = [];

    if (input.indicatorStale && input.consequential) {
      reasons.push('STALE_INDICATOR');
    }

    if (input.twinStale || input.digitalTwinStatus === DigitalTwinStatus.STALE) {
      reasons.push('STALE_TWIN');
    }

    if (input.twinStaleAt) {
      const ageMs = Date.now() - input.twinStaleAt.getTime();
      if (ageMs > STALE_TWIN_MAX_AGE_MS) {
        reasons.push('STALE_TWIN_AGE_EXCEEDED');
      }
    }

    if (input.digitalTwinStatus === DigitalTwinStatus.SAFE_HALTED) {
      reasons.push('TWIN_SAFE_HALTED');
    }

    if (
      input.metricCalculationStatus === MetricCalculationRunStatus.SAFE_HALTED ||
      input.metricCalculationStatus === MetricCalculationRunStatus.FAILED
    ) {
      reasons.push('METRIC_CALCULATION_SAFE_HALTED');
    }

    if (input.analysisRunStatus === AnalysisRunStatus.SAFE_HALTED) {
      reasons.push('ANALYSIS_RUN_SAFE_HALTED');
    }

    if (input.simulationRunStatus === SimulationRunStatus.SAFE_HALTED) {
      reasons.push('SIMULATION_RUN_SAFE_HALTED');
    }

    if (input.reportGenerationStatus === ReportGenerationRunStatus.SAFE_HALTED) {
      reasons.push('REPORT_GENERATION_SAFE_HALTED');
    }

    if (input.riskAssessmentStatus === RiskAssessmentStatus.SAFE_HALTED) {
      reasons.push('RISK_ASSESSMENT_SAFE_HALTED');
    }

    if (input.indicatorStatus === DashboardIndicatorStatus.SAFE_HALTED) {
      reasons.push('INDICATOR_SAFE_HALTED');
    }

    return {
      safeHalted: reasons.length > 0,
      reasons,
    };
  }

  assertConsequentialPathAllowed(input: SafeHaltEvaluationInput): void {
    const evaluation = this.evaluate(input);
    this.boundary.assertSafeHaltBlocksConsequentialPath(
      evaluation.safeHalted,
      input.consequential ?? false,
    );
  }
}
