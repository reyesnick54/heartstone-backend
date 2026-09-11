import { exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose';

export const TEST_OIDC_PROVIDER = {
  code: 'test-idp',
  name: 'Test Identity Provider',
  issuer: 'https://idp.test.example',
  audience: 'heartstone-api-test',
  jwksUri: 'https://idp.test.example/.well-known/jwks.json',
  allowedAlgorithms: ['RS256'],
  clockToleranceSeconds: 60,
};

export interface OidcTestKeyMaterial {
  privateKey: CryptoKey;
  publicJwk: JWK;
}

export async function createOidcTestKeyMaterial(): Promise<OidcTestKeyMaterial> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  publicJwk.kid = 'test-key-1';

  return { privateKey, publicJwk };
}

export interface OidcTestTokenOptions {
  subject: string;
  issuer?: string;
  audience?: string;
  expiresInSeconds?: number;
  amr?: string[];
  acr?: string;
  roles?: string[];
  includeExpired?: boolean;
}

export async function signOidcTestToken(
  keyMaterial: OidcTestKeyMaterial,
  options: OidcTestTokenOptions,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.includeExpired ? -60 : (options.expiresInSeconds ?? 3600);

  const builder = new SignJWT({
    ...(options.amr ? { amr: options.amr } : {}),
    ...(options.acr ? { acr: options.acr } : {}),
    ...(options.roles ? { roles: options.roles } : {}),
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuer(options.issuer ?? TEST_OIDC_PROVIDER.issuer)
    .setSubject(options.subject)
    .setAudience(options.audience ?? TEST_OIDC_PROVIDER.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn);

  return builder.sign(keyMaterial.privateKey);
}
