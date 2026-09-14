import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_12_AI_ENUM_NAMES,
  PHASE_12_AI_MODEL_NAMES,
  PHASE_12_ANALYSIS_MONITORING_ENUM_NAMES,
  PHASE_12_ANALYSIS_MONITORING_MODEL_NAMES,
  PHASE_12_DASHBOARD_ENUM_NAMES,
  PHASE_12_DASHBOARD_MODEL_NAMES,
  PHASE_12_ENUM_NAMES,
  PHASE_12_METRICS_ENUM_NAMES,
  PHASE_12_METRICS_MODEL_NAMES,
  PHASE_12_MODEL_NAMES,
  PHASE_12_REPORT_ENUM_NAMES,
  PHASE_12_REPORT_MODEL_NAMES,
  PHASE_12_STRATEGIC_PROJECT_ENUM_NAMES,
  PHASE_12_STRATEGIC_PROJECT_MODEL_NAMES,
  PHASE_12_TWIN_SIMULATION_ENUM_NAMES,
  PHASE_12_TWIN_SIMULATION_MODEL_NAMES,
} from './intelligence-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Phase 12 intelligence schema', () => {
  const schema = readSchema();

  it('defines exactly 60 Phase 12 models', () => {
    expect(PHASE_12_MODEL_NAMES).toHaveLength(60);
  });

  for (const modelName of PHASE_12_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('defines all Phase 12 metrics models', () => {
    for (const modelName of PHASE_12_METRICS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 dashboard models', () => {
    for (const modelName of PHASE_12_DASHBOARD_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 strategic project models', () => {
    for (const modelName of PHASE_12_STRATEGIC_PROJECT_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 AI models', () => {
    for (const modelName of PHASE_12_AI_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 analysis and monitoring models', () => {
    for (const modelName of PHASE_12_ANALYSIS_MONITORING_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 twin and simulation models', () => {
    for (const modelName of PHASE_12_TWIN_SIMULATION_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 report models', () => {
    for (const modelName of PHASE_12_REPORT_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 12 metrics enums', () => {
    for (const enumName of PHASE_12_METRICS_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 12 dashboard enums', () => {
    for (const enumName of PHASE_12_DASHBOARD_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 12 strategic project enums', () => {
    for (const enumName of PHASE_12_STRATEGIC_PROJECT_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 12 AI enums', () => {
    for (const enumName of PHASE_12_AI_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 12 analysis and monitoring enums', () => {
    for (const enumName of PHASE_12_ANALYSIS_MONITORING_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 12 twin and simulation enums', () => {
    for (const enumName of PHASE_12_TWIN_SIMULATION_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 12 report enums', () => {
    for (const enumName of PHASE_12_REPORT_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('links monitoring alerts to verification without self-verification fields', () => {
    const block = /model MonitoringAlert \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('isViolation');
    expect(block).toContain('verifications');
    expect(block).not.toContain('selfVerified');
  });

  it('marks AI execution as recommendatory only by default', () => {
    const block = /model AIExecutionRecord \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('isRecommendatoryOnly');
  });

  it('links evidence dashboard decision traces to government decisions read-only', () => {
    const block = /model EvidenceDashboardDecisionTrace \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('governmentDecisionId');
    expect(block).toContain('officialInstrumentId');
    expect(block).toContain('decisionTrace');
  });
});
