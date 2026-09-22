import { formatServicePackManifest } from './canonical-json.util';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import {
  TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE,
  TRANSPORTATION_GOVERNMENT_SERVICES,
} from './transportation-government-service-pack.template';
import { validateServicePackManifest } from './validate-service-pack';

describe('Transportation Government service pack', () => {
  it('validates the transportation service pack manifest', () => {
    const result = validateServicePackManifest(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares fifteen NON_PRODUCTION template services', () => {
    expect(TRANSPORTATION_GOVERNMENT_SERVICES).toHaveLength(15);
    expect(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE.services).toHaveLength(15);
    expect(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE.packLabel).toBe(
      SERVICE_PACK_NON_PRODUCTION_LABEL,
    );
    expect(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE.description).toMatch(/NON_PRODUCTION/);
  });

  it.each(TRANSPORTATION_GOVERNMENT_SERVICES)(
    'marks service $serviceCode as NON_PRODUCTION',
    (service) => {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    },
  );

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-transportation-government');
  });
});
