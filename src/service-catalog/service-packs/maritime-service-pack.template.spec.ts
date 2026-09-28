import { formatServicePackManifest } from './canonical-json.util';
import {
  MARITIME_SERVICE_PACK_TEMPLATE,
  MARITIME_SERVICES,
} from './maritime-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Maritime service pack template', () => {
  it('validates against the service pack manifest schema', () => {
    const result = validateServicePackManifest(MARITIME_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
  });

  it('deploys maritime services through the service pack manifest', () => {
    expect(MARITIME_SERVICES.length).toBeGreaterThan(0);
    expect(MARITIME_SERVICE_PACK_TEMPLATE.packId).toBe('template-blue-economy-maritime');
    expect(MARITIME_SERVICE_PACK_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    for (const service of MARITIME_SERVICES) {
      expect(service.serviceCode.startsWith('TEMPLATE-MAR-')).toBe(true);
      expect(
        service.forms.some((form) => form.sections.some((s) => s.sectionKey === 'vessel')),
      ).toBe(true);
    }
  });

  it('is stable under canonical formatting', () => {
    const first = formatServicePackManifest(MARITIME_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(MARITIME_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
  });
});
