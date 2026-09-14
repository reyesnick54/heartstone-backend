import { PHASE_11D_BOUNDARY_DISCLAIMER } from './communications.constants';
import { FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES } from './communications.constants';

describe('Phase 11D invariants', () => {
  it('distinguishes notification, notice, decision, delivery, and receipt', () => {
    expect(PHASE_11D_BOUNDARY_DISCLAIMER).toContain('Notification is not a notice');
    expect(PHASE_11D_BOUNDARY_DISCLAIMER).toContain('notice is not a decision');
    expect(PHASE_11D_BOUNDARY_DISCLAIMER).toContain('delivery attempt is not delivery');
    expect(PHASE_11D_BOUNDARY_DISCLAIMER).toContain('Delivery is not receipt');
  });

  it('does not recreate substantive notice models from earlier phases', () => {
    expect(FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES).toContain('DecisionNotice');
    expect(FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES).toContain('RedressNotice');
    expect(FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES).toContain('DeficiencyNotice');
  });
});
