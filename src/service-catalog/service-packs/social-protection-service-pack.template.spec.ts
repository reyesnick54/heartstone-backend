import { formatServicePackManifest } from './canonical-json.util';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import {
  SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE,
  SOCIAL_PROTECTION_SERVICES,
} from './social-protection-service-pack.template';
import { validateServicePackManifest } from './validate-service-pack';

describe('Social Protection & Public Benefits service pack', () => {
  it('validates the social protection service pack manifest', () => {
    const result = validateServicePackManifest(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares fifteen NON_PRODUCTION template services', () => {
    expect(SOCIAL_PROTECTION_SERVICES).toHaveLength(15);
    expect(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE.services).toHaveLength(15);
    expect(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE.packLabel).toBe(
      SERVICE_PACK_NON_PRODUCTION_LABEL,
    );
  });

  it.each(SOCIAL_PROTECTION_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-social-protection-public-benefits');
  });
});
