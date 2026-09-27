import { validateServicePackManifest } from '../../service-catalog/service-packs/validate-service-pack';
import {
  ABSEZ_SEZ_LICENCE_SERVICE_PACK_ID,
  ABSEZ_SEZ_TEMPLATE_SERVICE_CODES,
} from '../absez.constants';
import { ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK } from './sez-business-licence-service-pack';

describe('ABSEZ SEZ business licence service pack', () => {
  it('validates manifest structure', () => {
    const result = validateServicePackManifest(ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK);
    expect(result.valid).toBe(true);
    expect(ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK.packId).toBe(ABSEZ_SEZ_LICENCE_SERVICE_PACK_ID);
    expect(ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK.description).toMatch(/NON_PRODUCTION/);
  });

  it('includes apply, renewal, suspension, revocation, and appeal services', () => {
    const codes = ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK.services.map((service) => service.serviceCode);
    expect(codes).toContain(ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.APPLY);
    expect(codes).toContain(ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.RENEW);
    expect(codes).toContain(ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.SUSPEND);
    expect(codes).toContain(ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.REVOKE);
    expect(codes).toContain(ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.APPEAL);
  });
});
