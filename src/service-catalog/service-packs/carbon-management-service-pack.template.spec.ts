import { formatServicePackManifest } from './canonical-json.util';
import {
  CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE,
  CARBON_MANAGEMENT_SERVICES,
} from './carbon-management-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Carbon management service pack template', () => {
  it('validates as a deployable service pack manifest', () => {
    const result = validateServicePackManifest(CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('defines governed carbon-management services', () => {
    expect(CARBON_MANAGEMENT_SERVICES.length).toBeGreaterThan(0);
    expect(CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    for (const service of CARBON_MANAGEMENT_SERVICES) {
      expect(service.workflowStages.some((stage) => stage.stageKey === 'decision')).toBe(true);
    }
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
  });
});
