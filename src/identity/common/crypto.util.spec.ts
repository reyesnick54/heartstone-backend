import { generateOpaqueToken, hashSecret, hashToken, verifySecret } from './crypto.util';

describe('crypto.util', () => {
  it('hashes and verifies secrets', async () => {
    const hash = await hashSecret('test-password');
    expect(hash).toContain(':');
    expect(await verifySecret('test-password', hash)).toBe(true);
    expect(await verifySecret('wrong-password', hash)).toBe(false);
  });

  it('generates opaque tokens', () => {
    const token1 = generateOpaqueToken();
    const token2 = generateOpaqueToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(20);
  });

  it('hashes tokens deterministically', () => {
    const hash1 = hashToken('abc');
    const hash2 = hashToken('abc');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashToken('def'));
  });
});
