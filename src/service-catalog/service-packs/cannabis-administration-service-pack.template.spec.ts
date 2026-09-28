import { CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE } from './cannabis-administration-service-pack.template';
import { formatServicePackManifest } from './canonical-json.util';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Cannabis administration service pack template', () => {
  it('validates the manifest', () => {
    const result = validateServicePackManifest(CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('is marked NON_PRODUCTION', () => {
    expect(CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE.packLabel).toBe(
      SERVICE_PACK_NON_PRODUCTION_LABEL,
    );
    expect(CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE.description).toMatch(
      /NON_PRODUCTION|TEMPLATE ONLY/,
    );
  });

  it('has a stable fingerprint', () => {
    const first = formatServicePackManifest(CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
  });
});
