import { Test, type TestingModule } from '@nestjs/testing';

import { REPRESENTATIVE_SERVICE_PACK_MANIFEST } from '../../fixtures/representative-service-pack-manifest.fixture';
import { SERVICE_PACK_REASON_CODES } from '../../service-packs.constants';
import { ManifestValidatorService } from './manifest-validator.service';

describe('ManifestValidatorService', () => {
  let validator: ManifestValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ManifestValidatorService],
    }).compile();

    validator = module.get(ManifestValidatorService);
  });

  it('accepts a structurally valid v1 manifest', () => {
    const result = validator.validateManifest(REPRESENTATIVE_SERVICE_PACK_MANIFEST);
    expect(result.valid).toBe(true);
    expect(result.manifestVersion).toBe('heartstone.service-pack/v1');
    expect(result.issues).toHaveLength(0);
  });

  it('rejects malformed manifest payloads', () => {
    const result = validator.validateManifest(null);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST),
    ).toBe(true);
  });

  it('rejects unsupported manifest versions', () => {
    const result = validator.validateManifest({
      ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      manifestVersion: 'heartstone.service-pack/v99',
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (issue) => issue.code === SERVICE_PACK_REASON_CODES.UNSUPPORTED_MANIFEST_VERSION,
      ),
    ).toBe(true);
  });

  it('rejects duplicate codes within a section', () => {
    const result = validator.validateManifest({
      ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      services: [
        { code: 'duplicate-service', name: 'One' },
        { code: 'duplicate-service', name: 'Two' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === SERVICE_PACK_REASON_CODES.DUPLICATE_CODE),
    ).toBe(true);
  });

  it('rejects arbitrary executable code keys and patterns', () => {
    const withForbiddenKey = validator.validateManifest({
      ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      services: [
        {
          code: 'unsafe-service',
          name: 'Unsafe',
          script: 'process.exit(1)',
        },
      ],
    });
    expect(withForbiddenKey.valid).toBe(false);
    expect(
      withForbiddenKey.issues.some(
        (issue) => issue.code === SERVICE_PACK_REASON_CODES.EXECUTABLE_CODE_FORBIDDEN,
      ),
    ).toBe(true);

    const withExecutableString = validator.validateManifest({
      ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      services: [
        {
          code: 'unsafe-service',
          name: 'eval("malicious")',
        },
      ],
    });
    expect(withExecutableString.valid).toBe(false);
    expect(
      withExecutableString.issues.some(
        (issue) => issue.code === SERVICE_PACK_REASON_CODES.EXECUTABLE_CODE_FORBIDDEN,
      ),
    ).toBe(true);
  });

  it('rejects client-declared authority trust fields', () => {
    const result = validator.validateManifest({
      ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      authorityMappings: [
        {
          code: 'trusted-mapping',
          serviceCode: 'visitor-visa',
          functionAuthorityRecordCode: 'FAR-VISITOR-VISA-DETERMINATION',
          isValid: true,
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (issue) => issue.code === SERVICE_PACK_REASON_CODES.AUTHORITY_AUTO_VALID_FORBIDDEN,
      ),
    ).toBe(true);
  });

  it('rejects external dependencies marked as HeartStone-controlled', () => {
    const result = validator.validateManifest({
      ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      dependencies: [
        {
          dependencyCode: 'bad-provider',
          dependencyKind: 'PAYMENT_PROVIDER',
          referenceKind: 'payment-provider',
          referenceCode: 'stripe',
          controlScope: 'HEARTSTONE_CONTROLLED',
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (issue) => issue.code === SERVICE_PACK_REASON_CODES.EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED,
      ),
    ).toBe(true);
  });
});
