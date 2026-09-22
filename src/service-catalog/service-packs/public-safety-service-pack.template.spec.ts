import { formatServicePackManifest } from './canonical-json.util';
import {
  PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE,
  PUBLIC_SAFETY_SERVICES,
} from './public-safety-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Public Safety & Emergency service pack', () => {
  it('validates the public safety service pack manifest', () => {
    const result = validateServicePackManifest(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares twelve NON_PRODUCTION template services', () => {
    expect(PUBLIC_SAFETY_SERVICES).toHaveLength(12);
    expect(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE.services).toHaveLength(12);
    expect(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
  });

  it.each(PUBLIC_SAFETY_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-public-safety-emergency');
  });
});
