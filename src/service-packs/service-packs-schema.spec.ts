import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FORBIDDEN_SERVICE_PACK_AUTHORITY_FIELDS,
  SERVICE_PACK_VALIDATION_ENUM_NAMES,
  SERVICE_PACK_VALIDATION_MODEL_NAMES,
} from './service-packs-schema.constants';

describe('Service pack validation schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  for (const modelName of SERVICE_PACK_VALIDATION_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of SERVICE_PACK_VALIDATION_ENUM_NAMES) {
    it(`defines ${enumName} exactly once`, () => {
      const matches = schema.match(new RegExp(`enum ${enumName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('does not expose deploy or activate routes in the validation controller', () => {
    const controller = readFileSync(
      join(process.cwd(), 'src/service-packs/service-packs.controller.ts'),
      'utf8',
    );
    expect(controller).not.toMatch(/@Post\(['"][^'"]*deploy/i);
    expect(controller).not.toMatch(/@Post\(['"][^'"]*activate/i);
  });

  it('keeps forbidden authority trust fields out of service pack DTOs', () => {
    const dtoDir = join(process.cwd(), 'src/service-packs/packs/dto');
    const dtoFiles = ['create-service-pack.dto.ts', 'import-service-pack-manifest.dto.ts'];
    for (const file of dtoFiles) {
      const contents = readFileSync(join(dtoDir, file), 'utf8');
      for (const field of FORBIDDEN_SERVICE_PACK_AUTHORITY_FIELDS) {
        expect(contents).not.toContain(`${field}!:`);
        expect(contents).not.toContain(`${field}?:`);
      }
    }
  });
});
