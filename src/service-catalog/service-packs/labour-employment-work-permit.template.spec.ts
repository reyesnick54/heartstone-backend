import { formatServicePackManifest } from './canonical-json.util';
import {
  LABOUR_EMPLOYMENT_SERVICES,
  LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE,
} from './labour-employment-work-permit.template';
import { SERVICE_PACK_NON_PRODUCTION_LABEL } from './service-pack.constants';
import { validateServicePackManifest } from './validate-service-pack';

describe('Labour, Employment & Work Permit service pack', () => {
  it('validates the labour service pack manifest', () => {
    const result = validateServicePackManifest(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('declares sixteen NON_PRODUCTION template services', () => {
    expect(LABOUR_EMPLOYMENT_SERVICES).toHaveLength(16);
    expect(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE.services).toHaveLength(16);
    expect(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE.packLabel).toBe(
      SERVICE_PACK_NON_PRODUCTION_LABEL,
    );
  });

  it.each(LABOUR_EMPLOYMENT_SERVICES)('marks service $serviceCode as NON_PRODUCTION', (service) => {
    expect(service.description).toMatch(/NON_PRODUCTION/);
  });

  it('formats deterministically for template export', () => {
    const first = formatServicePackManifest(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE);
    const second = formatServicePackManifest(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE);
    expect(first).toBe(second);
    expect(first).toContain('template-labour-employment-work-permit');
  });
});
