import { formatServicePackManifest } from './canonical-json.util';
import {
  PROPERTY_LAND_REGISTRY_SERVICES,
  PROPERTY_LAND_REGISTRY_TEMPLATE,
} from './property-land-registry.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Land & Property Registry service pack', () => {
  it('validates the property registry service pack manifest', () => {
    const result = validateServicePackManifest(PROPERTY_LAND_REGISTRY_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares fourteen NON_PRODUCTION template services', () => {
    expect(PROPERTY_LAND_REGISTRY_SERVICES).toHaveLength(14);
    expect(PROPERTY_LAND_REGISTRY_TEMPLATE.services).toHaveLength(14);
    expect(PROPERTY_LAND_REGISTRY_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    expect(PROPERTY_LAND_REGISTRY_TEMPLATE.description).toMatch(/NON_PRODUCTION/);
  });

  it.each(PROPERTY_LAND_REGISTRY_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(PROPERTY_LAND_REGISTRY_TEMPLATE);
    const second = formatServicePackManifest(PROPERTY_LAND_REGISTRY_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-land-property-registry');
  });
});
