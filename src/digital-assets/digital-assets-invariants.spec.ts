import { DIGITAL_ASSETS_INVARIANTS, DIGITAL_ASSETS_TEMPLATE_SERVICE_DEFINITIONS } from './digital-assets.constants';

describe('Digital assets invariants', () => {
  it('keeps service definitions configurable without hardcoded national taxonomy', () => {
    for (const definition of DIGITAL_ASSETS_TEMPLATE_SERVICE_DEFINITIONS) {
      expect(definition.key).not.toMatch(/ANTIGUA/i);
    }
    expect(DIGITAL_ASSETS_INVARIANTS.consumesPlatformBlockchainVerification).toBe(true);
  });
});
