import { validateServicePackManifest } from '../../service-catalog/service-packs/validate-service-pack';
import { IMMIGRATION_TEMPLATE_SERVICE_DEFINITIONS } from '../immigration.constants';
import { IMMIGRATION_GOVERNMENT_SERVICE_PACK } from './immigration-government-service-pack.builder';

describe('Immigration government service pack', () => {
  it('validates the NON_PRODUCTION immigration pack manifest', () => {
    const result = validateServicePackManifest(IMMIGRATION_GOVERNMENT_SERVICE_PACK);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('defines twelve template immigration services', () => {
    expect(IMMIGRATION_GOVERNMENT_SERVICE_PACK.services).toHaveLength(12);
    expect(IMMIGRATION_GOVERNMENT_SERVICE_PACK.services.map((s) => s.serviceCode)).toEqual(
      IMMIGRATION_TEMPLATE_SERVICE_DEFINITIONS.map(
        (definition) => `NON_PRODUCTION-IMM-${definition.key}`,
      ),
    );
  });

  it('labels every template service description as NON_PRODUCTION', () => {
    for (const service of IMMIGRATION_GOVERNMENT_SERVICE_PACK.services) {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    }
    expect(IMMIGRATION_GOVERNMENT_SERVICE_PACK.packLabel).toBe('NON_PRODUCTION');
    expect(IMMIGRATION_GOVERNMENT_SERVICE_PACK.description).toMatch(/NON_PRODUCTION/);
  });
});
