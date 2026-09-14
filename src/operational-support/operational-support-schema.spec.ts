import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INTEGRATION_ACCEPTANCE_STATUSES,
  PHASE_11_COMMUNICATIONS_ENUM_NAMES,
  PHASE_11_COMMUNICATIONS_MODEL_NAMES,
  PHASE_11_ENUM_NAMES,
  PHASE_11_FINANCIAL_ENUM_NAMES,
  PHASE_11_FINANCIAL_MODEL_NAMES,
  PHASE_11_INTEGRATIONS_ENUM_NAMES,
  PHASE_11_INTEGRATIONS_MODEL_NAMES,
  PHASE_11_MODEL_NAMES,
} from './operational-support-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Phase 11 operational support schema', () => {
  const schema = readSchema();

  for (const modelName of PHASE_11_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('defines all Phase 11 financial models', () => {
    for (const modelName of PHASE_11_FINANCIAL_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 11 communications models', () => {
    for (const modelName of PHASE_11_COMMUNICATIONS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 11 integrations models', () => {
    for (const modelName of PHASE_11_INTEGRATIONS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all Phase 11 financial enums', () => {
    for (const enumName of PHASE_11_FINANCIAL_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 11 communications enums', () => {
    for (const enumName of PHASE_11_COMMUNICATIONS_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all Phase 11 integrations enums', () => {
    for (const enumName of PHASE_11_INTEGRATIONS_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('links communication messages to decisionNoticeReference without duplicating decision models', () => {
    const block =
      /model CommunicationMessage \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('decisionNoticeReference');
    expect(block).not.toContain('model GovernmentDecision');
  });

  it('defines integration acceptance statuses including institutional and operational gates', () => {
    const block = /enum IntegrationAcceptanceStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    for (const status of INTEGRATION_ACCEPTANCE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('preserves both local and external values on source discrepancies', () => {
    const block = /model SourceDiscrepancy \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('localValue');
    expect(block).toContain('externalValue');
    const statusBlock = /enum SourceDiscrepancyStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(statusBlock).toContain('SAFE_HALTED');
  });

  it('links refund requests to redress implementation actions', () => {
    const block = /model RefundRequest \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('redressImplementationActionId');
  });
});
