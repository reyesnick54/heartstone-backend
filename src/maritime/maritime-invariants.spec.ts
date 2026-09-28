import { MARITIME_INVARIANTS, MARITIME_TEMPLATE_SERVICE_DEFINITIONS } from './maritime.constants';

describe('Maritime invariants', () => {
  it('keeps service definitions configurable without hardcoded national taxonomy', () => {
    for (const definition of MARITIME_TEMPLATE_SERVICE_DEFINITIONS) {
      expect(definition.key).not.toMatch(/ANTIGUA|BARBUDA/i);
    }
    expect(MARITIME_INVARIANTS.maritimeApprovalDoesNotAuthorizeCustomsRelease).toBe(true);
  });
});
