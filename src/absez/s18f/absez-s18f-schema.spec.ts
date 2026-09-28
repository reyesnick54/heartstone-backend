import { ABSEZ_ARTICLE9_DEPARTMENTS } from '../../setup/data/absez-article9-departments.data';
import { ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS } from './article9/absez-article9-service-paths.data';
import { ABSEZ_S18F_SCHEMA_MODELS } from './absez-s18f-schema.constants';

describe('Remediation S18F schema constants', () => {
  it('declares S18F prisma models', () => {
    expect(ABSEZ_S18F_SCHEMA_MODELS.length).toBeGreaterThanOrEqual(15);
    expect(ABSEZ_S18F_SCHEMA_MODELS).toContain('FreeZoneCustomsCase');
    expect(ABSEZ_S18F_SCHEMA_MODELS).toContain('InvestorInquiryRecord');
  });

  it('maps all 19 Article 9 departments to service paths', () => {
    expect(ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS.length).toBe(ABSEZ_ARTICLE9_DEPARTMENTS.length);
    expect(ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS.length).toBe(19);
  });
});
