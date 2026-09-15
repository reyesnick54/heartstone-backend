import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEPENDENCY_TYPES,
  LOG_CLASSIFICATIONS,
  PERFORMANCE_TEST_SCENARIOS,
  PHASE_13C_ENUM_NAMES,
  PHASE_13C_MODEL_NAMES,
  RATE_LIMIT_SCOPES,
  RUNBOOK_SCENARIOS,
  SLI_INDICATOR_TYPES,
  TECHNICAL_HEALTH_STATES,
} from './production-reliability-schema.constants';

const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('Phase 13C production reliability schema', () => {
  for (const modelName of PHASE_13C_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13C_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const indicatorType of SLI_INDICATOR_TYPES) {
    it(`supports SLI indicator type ${indicatorType}`, () => {
      expect(schema).toContain(indicatorType);
    });
  }

  for (const state of TECHNICAL_HEALTH_STATES) {
    it(`supports technical health state ${state}`, () => {
      expect(schema).toContain(state);
    });
  }

  for (const dep of DEPENDENCY_TYPES) {
    it(`supports dependency type ${dep}`, () => {
      expect(schema).toContain(dep);
    });
  }

  for (const scenario of PERFORMANCE_TEST_SCENARIOS) {
    it(`supports performance test scenario ${scenario}`, () => {
      expect(schema).toContain(scenario);
    });
  }

  for (const scope of RATE_LIMIT_SCOPES) {
    it(`supports rate limit scope ${scope}`, () => {
      expect(schema).toContain(scope);
    });
  }

  for (const classification of LOG_CLASSIFICATIONS) {
    it(`supports log classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }

  it('defaults SLO disclaimer that targets are not guaranteed', () => {
    const block = /model ServiceLevelObjective \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('notGuaranteedDisclaimer');
  });

  it('defaults operational health events as not institutional status', () => {
    const block = /model OperationalHealthEvent \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('notInstitutionalStatus');
  });

  it('defaults alert events as not institutional decision', () => {
    const block = /model OperationalAlertEvent \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('notInstitutionalDecision');
    expect(block).toContain('requirementsWaived');
  });

  it('blocks unsafe production load test targets', () => {
    expect(schema).toContain('BLOCKED_UNSAFE_TARGET');
  });

  it('supports all required runbook scenario types in constants', () => {
    expect(RUNBOOK_SCENARIOS).toHaveLength(11);
  });
});
