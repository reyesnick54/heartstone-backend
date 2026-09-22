import {
  TRANSPORTATION_SERVICE_PACK_ID,
  TRANSPORTATION_TEMPLATE_AUTHORITY,
} from './transportation.constants';

describe('Transportation service pack invariants', () => {
  it('declares canonical service pack id', () => {
    expect(TRANSPORTATION_SERVICE_PACK_ID).toBe('template-transportation-government');
  });

  it('registers template authority function placeholders', () => {
    expect(TRANSPORTATION_TEMPLATE_AUTHORITY.licenseIssue).toBe(
      'TEMPLATE-AUTH-TRANSPORT-LICENSE-ISSUE',
    );
    expect(TRANSPORTATION_TEMPLATE_AUTHORITY.registrationDecide).toBe(
      'TEMPLATE-AUTH-TRANSPORT-REGISTRATION-DECIDE',
    );
  });
});
