import {
  CARBON_MANAGEMENT_INVARIANTS,
  CARBON_MANAGEMENT_TEMPLATE_SERVICE_DEFINITIONS,
  CARBON_MARKET_MECHANICS_EXTENSION_DEFAULT,
} from './carbon-management.constants';

describe('Carbon management invariants', () => {
  it('keeps service definitions configurable without hardcoded national taxonomy', () => {
    for (const definition of CARBON_MANAGEMENT_TEMPLATE_SERVICE_DEFINITIONS) {
      expect(definition.key).not.toMatch(/ANTIGUA|ABSEZ/i);
    }
    expect(CARBON_MANAGEMENT_INVARIANTS.marketMechanicsRemainConfigurable).toBe(true);
    expect(CARBON_MARKET_MECHANICS_EXTENSION_DEFAULT).toBe('NOT_CONFIGURED');
  });
});
