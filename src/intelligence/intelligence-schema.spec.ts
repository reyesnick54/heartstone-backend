import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INTELLIGENCE_ALERT_STATUSES, RISK_EVIDENCE_BASIS_VALUES } from './intelligence.constants';
import { PHASE_12E_ENUM_NAMES, PHASE_12E_MODEL_NAMES } from './intelligence-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 12E intelligence schema', () => {
  for (const modelName of PHASE_12E_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12E_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('keeps compliance MonitoringRule separate from intelligence monitoring', () => {
    expect(schema.match(/model MonitoringRule \{/g)).toHaveLength(1);
    expect(schema.match(/model IntelligenceMonitoringRule \{/g)).toHaveLength(1);
  });

  it('stores analysis material output fields on runs and children', () => {
    const runBlock = /model AnalysisRun \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(runBlock).toContain('method');
    expect(runBlock).toContain('assumptions');
    expect(runBlock).toContain('limitations');
    expect(runBlock).toContain('outputReplayHash');
  });

  it('preserves exact conflicting source values', () => {
    const sourceBlock = /model AnalysisSource \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(sourceBlock).toContain('exactValue');
    expect(sourceBlock).toContain('conflictGroupId');
    expect(sourceBlock).toContain('preservedConflict');
  });

  it('requires intelligence monitoring rule governance fields', () => {
    const ruleBlock = /model IntelligenceMonitoringRule \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(ruleBlock).toContain('approvedSourceReference');
    expect(ruleBlock).toContain('ownerIdentityId');
    expect(ruleBlock).toContain('reviewerIdentityId');
    expect(ruleBlock).toContain('frequency');
    expect(ruleBlock).toContain('effectiveFrom');
  });

  it('defaults intelligence alerts to non-violation non-emergency', () => {
    const alertBlock = /model IntelligenceMonitoringAlert \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(alertBlock).toContain('isViolation');
    expect(alertBlock).toContain('isEmergency');
    expect(alertBlock).toContain('isEnforcement');
    expect(alertBlock).toContain('status');
  });

  for (const status of INTELLIGENCE_ALERT_STATUSES) {
    it(`supports intelligence alert status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const basis of RISK_EVIDENCE_BASIS_VALUES) {
    it(`supports risk evidence basis ${basis}`, () => {
      expect(schema).toContain(basis);
    });
  }

  it('versions risk methodology', () => {
    const definitionBlock = /model RiskDefinition \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(definitionBlock).toContain('methodologyVersion');
  });

  it('prevents risk score mandatory gate bypass by default', () => {
    const assessmentBlock = /model RiskAssessment \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(assessmentBlock).toContain('scoreIsMandatoryGateBypass');
  });
});
