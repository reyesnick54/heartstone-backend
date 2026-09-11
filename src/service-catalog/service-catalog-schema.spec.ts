import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SERVICE_CATALOG_MODEL_NAMES } from './service-catalog-schema.constants';

describe('Service Catalog schema coherence', () => {
  const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

  for (const modelName of SERVICE_CATALOG_MODEL_NAMES) {
    it(`defines model ${modelName}`, () => {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    });
  }

  it('does not define APPROVED as an eligibility guidance outcome', () => {
    const outcomeBlock = /enum EligibilityGuidanceOutcome \{[^}]+\}/.exec(schema)?.[0] ?? '';
    expect(outcomeBlock).not.toContain('APPROVED');
  });
});
