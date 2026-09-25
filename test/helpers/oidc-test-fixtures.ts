import { exportJWK, generateKeyPair, type JWK, type KeyLike,SignJWT } from 'jose';

import { type OidcProviderConfig } from '../../src/config/config.constants';

export const TEST_OIDC_PROVIDER: OidcProviderConfig = {
  code: 'test-idp',
  name: 'Test IdP',
  issuer: 'https://issuer.test',
  audience: 'heartstone-api',
  jwksUri: 'https://issuer.test/jwks',
  allowedAlgorithms: ['RS256'],
  clockToleranceSeconds: 0,
};

export interface OidcTestKeyMaterial {
  privateKey: KeyLike;
  publicJwk: JWK;
}

export async function createOidcTestKeyMaterial(): Promise<OidcTestKeyMaterial> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'RS256';
  publicJwk.kid = 'test-key';
  return { privateKey, publicJwk };
}

export async function signOidcTestToken(
  keyMaterial: OidcTestKeyMaterial,
  options: {
    subject: string;
    issuer?: string;
    audience?: string;
    amr?: string[];
    includeExpired?: boolean;
  },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = options.includeExpired ? now - 60 : now + 3600;

  return new SignJWT({
    amr: options.amr,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
    .setIssuer(options.issuer ?? TEST_OIDC_PROVIDER.issuer)
    .setAudience(options.audience ?? TEST_OIDC_PROVIDER.audience)
    .setSubject(options.subject)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(keyMaterial.privateKey);
}
