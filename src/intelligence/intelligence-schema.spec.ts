import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DASHBOARD_FILTER_DIMENSIONS,
  DEPARTMENTAL_INDICATOR_CATEGORIES,
  EXECUTIVE_INDICATOR_CATEGORIES,
  PHASE_12B_ENUM_NAMES,
  PHASE_12B_MODEL_NAMES,
} from './intelligence-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 12B intelligence schema', () => {
  for (const modelName of PHASE_12B_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12B_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

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
