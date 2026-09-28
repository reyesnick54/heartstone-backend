import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  CANNABIS_INVARIANTS,
  CANNABIS_TEMPLATE_SERVICE_DEFINITIONS,
  FORBIDDEN_UNSUPPORTED_CANNABIS_REGULATORY_FEATURES,
} from './cannabis-administration.constants';

describe('Cannabis administration invariants', () => {
  it('keeps service definitions configurable without hardcoded national taxonomy', () => {
    for (const definition of CANNABIS_TEMPLATE_SERVICE_DEFINITIONS) {
      expect(definition.key).not.toMatch(/ANTIGUA|CULTIVATION|DISPENSARY|RETAIL/i);
    }
    expect(CANNABIS_INVARIANTS.categoriesFromConfigurationOnly).toBe(true);
  });

  it('11. no unsupported cannabis regulatory rule was invented in domain sources', () => {
    const domainDir = path.join(__dirname);
    const files = fs
      .readdirSync(domainDir, { recursive: true })
      .filter((entry): entry is string => {
        if (typeof entry !== 'string' || !entry.endsWith('.ts')) {
          return false;
        }
        if (entry.includes('.spec.ts') || entry.endsWith('cannabis-administration.constants.ts')) {
          return false;
        }
        return (
          entry.startsWith('common/') ||
          entry.startsWith('configuration/') ||
          entry.startsWith('entities/') ||
          entry.startsWith('external/') ||
          entry.startsWith('licences/') ||
          entry.startsWith('regulatory/') ||
          entry.startsWith('sites/')
        );
      });

    const forbiddenPatterns = [
      /seedToSale/i,
      /plantInventory/i,
      /productTracking/i,
      /quotaAllocation/i,
      /potencyControl/i,
      /dispensingRule/i,
    ];

    for (const file of files) {
      const contents = fs.readFileSync(path.join(domainDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(contents).not.toMatch(pattern);
      }
    }

    expect(FORBIDDEN_UNSUPPORTED_CANNABIS_REGULATORY_FEATURES).toContain('SEED_TO_SALE_TRACKING');
  });
});
