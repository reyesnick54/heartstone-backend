import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONSEQUENTIAL_USE_IMPACT_AREAS,
  DIGITAL_TWIN_MODES,
  DIGITAL_TWIN_SOURCE_STATUSES,
  DIGITAL_TWIN_TYPES,
} from './intelligence.constants';
import { PHASE_12F_ENUM_NAMES, PHASE_12F_MODEL_NAMES } from './intelligence-schema.constants';
import { INTELLIGENCE_ALERT_STATUSES, RISK_EVIDENCE_BASIS_VALUES } from './intelligence.constants';
import { PHASE_12E_ENUM_NAMES, PHASE_12E_MODEL_NAMES } from './intelligence-schema.constants';
import {
  DASHBOARD_FILTER_DIMENSIONS,
  DEPARTMENTAL_INDICATOR_CATEGORIES,
  EXECUTIVE_INDICATOR_CATEGORIES,
  PHASE_12B_ENUM_NAMES,
  PHASE_12B_MODEL_NAMES,
} from './intelligence-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 12F schema guard', () => {
  for (const modelName of PHASE_12F_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
describe('Phase 12E intelligence schema', () => {
  for (const modelName of PHASE_12E_MODEL_NAMES) {
describe('Phase 12B intelligence schema', () => {
  for (const modelName of PHASE_12B_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12F_ENUM_NAMES) {
  for (const enumName of PHASE_12E_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
  for (const enumName of PHASE_12B_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const twinType of DIGITAL_TWIN_TYPES) {
    it(`supports digital twin type ${twinType}`, () => {
      expect(schema).toContain(twinType);
    });
  }

  for (const mode of DIGITAL_TWIN_MODES) {
    it(`supports digital twin mode ${mode}`, () => {
      expect(schema).toContain(mode);
    });
  }

  for (const sourceStatus of DIGITAL_TWIN_SOURCE_STATUSES) {
    it(`supports digital twin source status ${sourceStatus}`, () => {
      expect(schema).toContain(sourceStatus);
    });
  }

  for (const impactArea of CONSEQUENTIAL_USE_IMPACT_AREAS) {
    it(`supports consequential use impact area ${impactArea}`, () => {
      expect(schema).toContain(impactArea);
    });
  }

  it('marks twin as non-authoritative by default', () => {
    expect(schema).toContain('isAuthoritativeRecord');
    expect(schema).toContain('@default(false)');
  });

  it('requires rollback plan for live transition', () => {
    expect(schema).toContain('rollbackPlanReference');
  });

  it('keeps snapshots immutable', () => {
    expect(schema).toContain('isImmutable');
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
  for (const category of EXECUTIVE_INDICATOR_CATEGORIES) {
    it(`supports executive indicator category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  for (const category of DEPARTMENTAL_INDICATOR_CATEGORIES) {
    it(`supports departmental indicator category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  for (const dimension of DASHBOARD_FILTER_DIMENSIONS) {
    it(`supports filter dimension ${dimension}`, () => {
      expect(schema).toContain(dimension);
    });
  }

  it('requires status dictionary entry fields', () => {
    expect(schema).toContain('colorSemantic');
    expect(schema).toContain('sourceRequirements');
    expect(schema).toContain('calculationRule');
    expect(schema).toContain('permittedTransitions');
    expect(schema).toContain('stalenessRule');
  });

  it('tracks indicator staleness explicitly', () => {
    expect(schema).toContain('calculatedAt');
    expect(schema).toContain('sourceFreshness');
    expect(schema).toContain('staleAfter');
    expect(schema).toContain('currentStaleness');
    expect(schema).toContain('sourceAvailability');
  });

  it('requires drilldown references for material indicators', () => {
    expect(schema).toContain('drilldownRequired');
    expect(schema).toContain('DashboardDrilldownReference');
  });

  it('makes snapshots immutable by default', () => {
    expect(schema).toContain('isImmutable');
    expect(schema).toContain('@default(true)');
  });

  it('separates technical permission from substantive access', () => {
    expect(schema).toContain('technicalPermissionOnly');
    expect(schema).toContain('substantiveAccessRequired');
    expect(schema).toContain('requiresInstitutionalBoundary');
  });

  it('uses presentation-only color semantics', () => {
    expect(schema).toContain('POSITIVE_PRESENTATION');
    expect(schema).toContain('CAUTION_PRESENTATION');
    expect(schema).not.toContain('LEGALLY_COMPLIANT');
    expect(schema).not.toContain('VIOLATION');
  });
});
