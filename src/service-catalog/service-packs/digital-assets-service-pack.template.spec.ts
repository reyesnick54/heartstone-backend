import { formatServicePackManifest } from './canonical-json.util';
import {
  DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE,
  DIGITAL_ASSETS_SERVICES,
} from './digital-assets-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Digital assets service pack template', () => {
  it('validates as a deployable service pack manifest', () => {
    const result = validateServicePackManifest(DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('defines governed digital-asset services', () => {
    expect(DIGITAL_ASSETS_SERVICES.length).toBeGreaterThan(0);
    expect(DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    for (const service of DIGITAL_ASSETS_SERVICES) {
      expect(service.workflowStages.some((stage) => stage.stageKey === 'decision')).toBe(true);
    }
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
  });
});
