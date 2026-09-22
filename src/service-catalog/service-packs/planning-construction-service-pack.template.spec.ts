import { formatServicePackManifest } from './canonical-json.util';
import {
  PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE,
  PLANNING_CONSTRUCTION_SERVICES,
} from './planning-construction-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Planning, Development & Construction service pack', () => {
  it('validates the planning construction service pack manifest', () => {
    const result = validateServicePackManifest(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares fifteen NON_PRODUCTION template services', () => {
    expect(PLANNING_CONSTRUCTION_SERVICES).toHaveLength(15);
    expect(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE.services).toHaveLength(15);
    expect(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE.packLabel).toBe(
      SERVICE_PACK_NON_PRODUCTION_LABEL,
    );
  });

  it.each(PLANNING_CONSTRUCTION_SERVICES)(
    'marks service $serviceCode as NON_PRODUCTION',
    (service) => {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    },
  );

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-planning-construction');
  });
});
