import { formatServicePackManifest } from './canonical-json.util';
import {
  REVENUE_TAX_ADMINISTRATION_TEMPLATE,
  REVENUE_TAX_SERVICES,
} from './revenue-tax-administration.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Revenue & Tax Administration service pack', () => {
  it('validates the revenue tax administration service pack manifest', () => {
    const result = validateServicePackManifest(REVENUE_TAX_ADMINISTRATION_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares fourteen NON_PRODUCTION template services', () => {
    expect(REVENUE_TAX_SERVICES).toHaveLength(14);
    expect(REVENUE_TAX_ADMINISTRATION_TEMPLATE.services).toHaveLength(14);
    expect(REVENUE_TAX_ADMINISTRATION_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    expect(REVENUE_TAX_ADMINISTRATION_TEMPLATE.description).toMatch(/NON_PRODUCTION/);
  });

  it.each(REVENUE_TAX_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(REVENUE_TAX_ADMINISTRATION_TEMPLATE);
    const second = formatServicePackManifest(REVENUE_TAX_ADMINISTRATION_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-revenue-tax-administration');
  });
});
