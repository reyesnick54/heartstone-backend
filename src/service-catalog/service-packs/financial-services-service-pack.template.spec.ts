import { formatServicePackManifest } from './canonical-json.util';
import { FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE } from './financial-services-service-pack.template';
import { validateServicePackManifest } from './validate-service-pack';

describe('Financial services service pack template', () => {
  it('validates the financial services service pack manifest', () => {
    const result = validateServicePackManifest(FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE.services.length).toBeGreaterThan(0);
    for (const service of FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE.services) {
      expect(service.description).toMatch(/NON_PRODUCTION|configurable/i);
    }
  });

  it('formats deterministically', () => {
    const first = formatServicePackManifest(FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
  });
});
