import { formatServicePackManifest } from './canonical-json.util';
import {
  EDUCATION_SERVICE_PACK_TEMPLATE,
  EDUCATION_SERVICES,
} from './education-service-pack.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Education service pack', () => {
  it('validates the education service pack manifest', () => {
    const result = validateServicePackManifest(EDUCATION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares sixteen NON_PRODUCTION template services', () => {
    expect(EDUCATION_SERVICES).toHaveLength(16);
    expect(EDUCATION_SERVICE_PACK_TEMPLATE.services).toHaveLength(16);
    expect(EDUCATION_SERVICE_PACK_TEMPLATE.packLabel).toBe(SERVICE_PACK_NON_PRODUCTION_LABEL);
    expect(EDUCATION_SERVICE_PACK_TEMPLATE.description).toMatch(/NON_PRODUCTION/);
  });

  it.each(EDUCATION_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('requires decision workflow for scholarship service', () => {
    const scholarship = EDUCATION_SERVICES.find((service) =>
      service.serviceCode.includes('SCHOLARSHIP'),
    );
    expect(scholarship?.decisionStages[0]?.requiresSecondApproval).toBe(true);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(EDUCATION_SERVICE_PACK_TEMPLATE);
    const second = formatServicePackManifest(EDUCATION_SERVICE_PACK_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-education-government');
  });
});
