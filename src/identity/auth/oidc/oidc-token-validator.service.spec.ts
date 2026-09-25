import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet } from 'jose';

import {
  createOidcTestKeyMaterial,
  signOidcTestToken,
  TEST_OIDC_PROVIDER,
} from '../../../../test/helpers/oidc-test-fixtures';
import { ClaimMapperService } from './claim-mapper.service';
import {
  CompositeJwksResolverService,
  InMemoryJwksResolverService,
  RemoteJwksResolverService,
} from './jwks-resolver.service';
import { OidcTokenValidatorService } from './oidc-token-validator.service';

describe('OidcTokenValidatorService', () => {
  let validator: OidcTokenValidatorService;
  let inMemoryJwks: InMemoryJwksResolverService;
  let keyMaterial: Awaited<ReturnType<typeof createOidcTestKeyMaterial>>;

  beforeAll(async () => {
    keyMaterial = await createOidcTestKeyMaterial();
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OidcTokenValidatorService,
        ClaimMapperService,
        RemoteJwksResolverService,
        InMemoryJwksResolverService,
        CompositeJwksResolverService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              enabled: true,
              providers: [TEST_OIDC_PROVIDER],
            }),
          },
        },
      ],
    }).compile();

    validator = moduleRef.get(OidcTokenValidatorService);
    inMemoryJwks = moduleRef.get(InMemoryJwksResolverService);
    inMemoryJwks.register(
      TEST_OIDC_PROVIDER.jwksUri,
      createLocalJWKSet({ keys: [keyMaterial.publicJwk] }),
    );
  });

  it('validates a signed OIDC token using controlled fixtures', async () => {
    const token = await signOidcTestToken(keyMaterial, {
      subject: 'user-valid',
      amr: ['pwd', 'mfa'],
    });

    const result = await validator.validateAccessToken(
      token,
      TEST_OIDC_PROVIDER.code,
      inMemoryJwks,
    );

    expect(result.claims.subject).toBe('user-valid');
    expect(result.claims.mfaSatisfied).toBe(true);
    expect(result.provider.code).toBe(TEST_OIDC_PROVIDER.code);
  });

  it('rejects invalid issuer', async () => {
    const token = await signOidcTestToken(keyMaterial, {
      subject: 'user-1',
      issuer: 'https://evil.example',
    });

    await expect(
      validator.validateAccessToken(token, TEST_OIDC_PROVIDER.code, inMemoryJwks),
    ).rejects.toThrow('iss');
  });

  it('rejects invalid audience', async () => {
    const token = await signOidcTestToken(keyMaterial, {
      subject: 'user-1',
      audience: 'wrong-audience',
    });

    await expect(
      validator.validateAccessToken(token, TEST_OIDC_PROVIDER.code, inMemoryJwks),
    ).rejects.toThrow('aud');
  });

  it('rejects expired token', async () => {
    const token = await signOidcTestToken(keyMaterial, {
      subject: 'user-1',
      includeExpired: true,
    });

    await expect(
      validator.validateAccessToken(token, TEST_OIDC_PROVIDER.code, inMemoryJwks),
    ).rejects.toThrow();
  });

  it('rejects invalid signature', async () => {
    const otherKeys = await createOidcTestKeyMaterial();
    const token = await signOidcTestToken(otherKeys, { subject: 'user-1' });

    await expect(
      validator.validateAccessToken(token, TEST_OIDC_PROVIDER.code, inMemoryJwks),
    ).rejects.toThrow();
  });
});
