import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SETUP_CONFIGURATION_MODEL_NAMES } from './setup-schema.constants';

describe('S11 setup configuration schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it.each(SETUP_CONFIGURATION_MODEL_NAMES)('declares %s', (modelName) => {
    expect(schema).toContain(`model ${modelName}`);
  });

  it('declares layered configuration scope keys for idempotent installation', () => {
    expect(schema).toContain('scopeKey');
    expect(schema).toContain('enum SetupConfigurationLayer');
  });
});
