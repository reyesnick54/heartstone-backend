import { formatServicePackManifest } from './canonical-json.util';
import {
  CORPORATE_REGISTRY_SERVICE_PACK,
  CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS,
} from './corporate-registry-service-pack';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Corporate Registry / Business Formation service pack', () => {
  it('validates the corporate registry service pack manifest', () => {
    const result = validateServicePackManifest(CORPORATE_REGISTRY_SERVICE_PACK);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares fourteen NON_PRODUCTION template services', () => {
    expect(CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS).toHaveLength(14);
    expect(CORPORATE_REGISTRY_SERVICE_PACK.services).toHaveLength(14);
    expect(CORPORATE_REGISTRY_SERVICE_PACK.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    expect(CORPORATE_REGISTRY_SERVICE_PACK.description).toMatch(/NON_PRODUCTION/);
  });

  it.each(CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS)(
    'marks service $serviceCode as NON_PRODUCTION',
    (service) => {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    },
  );

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(CORPORATE_REGISTRY_SERVICE_PACK);
    const second = formatServicePackManifest(CORPORATE_REGISTRY_SERVICE_PACK);
    expect(first).toBe(second);
    expect(first).toContain('corporate-registry-business-formation-pack');
  });
});
