import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SERVICE_PACK_GOVERNANCE_MODEL_NAMES } from './service-pack-governance.constants';

describe('Service pack governance schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  for (const modelName of SERVICE_PACK_GOVERNANCE_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('documents governance endpoints separately from validation deploy/activate routes', () => {
    const controller = readFileSync(
      join(process.cwd(), 'src/service-packs/governance/service-pack-governance.controller.ts'),
      'utf8',
    );
    expect(controller).toContain("Post(':id/accept')");
    expect(controller).not.toMatch(/@Post\(['"][^'"]*activate/i);
  });
});
