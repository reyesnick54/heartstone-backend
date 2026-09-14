import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_12_FOUNDATION_MODEL_NAMES,
  PHASE_12G_ENUM_NAMES,
  PHASE_12G_MODEL_NAMES,
  REPORT_OUTCOME_CLASSIFICATIONS,
  REPORT_TYPES,
} from './reporting-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 12G reporting schema', () => {
  for (const modelName of [...PHASE_12_FOUNDATION_MODEL_NAMES, ...PHASE_12G_MODEL_NAMES]) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12G_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const reportType of REPORT_TYPES) {
    it(`supports report type ${reportType}`, () => {
      expect(schema).toContain(reportType);
    });
  }

  for (const outcome of REPORT_OUTCOME_CLASSIFICATIONS) {
    it(`supports outcome classification ${outcome}`, () => {
      expect(schema).toContain(outcome);
    });
  }

  it('pins metric calculation runs on report generation', () => {
    expect(schema).toContain('ReportGenerationRunMetricPin');
    expect(schema).toContain('metricCalculationRunId');
  });

  it('links report claims to institutional metric claims', () => {
    expect(schema).toContain('institutionalMetricClaimId');
    expect(schema).toContain('isOfficialClaim');
    expect(schema).toContain('@default(false)');
  });

  it('preserves publication immutability fields', () => {
    expect(schema).toContain('frozenSnapshotHash');
    expect(schema).toContain('frozenContent');
    expect(schema).toContain('dataCutoffAt');
  });

  it('supports non-destructive report corrections', () => {
    expect(schema).toContain('originalContent');
    expect(schema).toContain('correctedContent');
    expect(schema).toContain('ReportCorrectionAffectedClaim');
  });

  it('defines evidence-dashboard-decision trace chain', () => {
    expect(schema).toContain('EvidenceDashboardDecisionTrace');
    expect(schema).toContain('traceSnapshot');
    expect(schema).toContain('governmentDecisionId');
  });

  it('tracks government statistic confirmation separately', () => {
    expect(schema).toContain('representsGovernmentStatistic');
    expect(schema).toContain('governmentStatisticConfirmed');
  });

  it('marks AI review proposals explicitly', () => {
    expect(schema).toContain('isAiProposed');
    expect(schema).toContain('isAiActor');
  });
});
