import { formatServicePackManifest } from './canonical-json.util';
import {
  CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE,
  CUSTOMS_TRADE_SERVICES,
} from './customs-trade-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Customs & Trade service pack', () => {
  it('validates the customs trade service pack manifest', () => {
    const result = validateServicePackManifest(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares sixteen NON_PRODUCTION template services', () => {
    expect(CUSTOMS_TRADE_SERVICES).toHaveLength(16);
    expect(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE.services).toHaveLength(16);
    expect(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    expect(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE.description).toMatch(/NON_PRODUCTION/);
  });

  it.each(CUSTOMS_TRADE_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-customs-trade-administration');
  });
});
