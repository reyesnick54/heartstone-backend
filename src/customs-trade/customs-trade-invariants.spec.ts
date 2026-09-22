import {
  CUSTOMS_AI_BOUNDARY_DISCLAIMER,
  CUSTOMS_BOUNDARY_DISCLAIMER,
  CUSTOMS_PAYMENT_BOUNDARY_DISCLAIMER,
  CUSTOMS_REASON_CODES,
  FORBIDDEN_AI_CUSTOMS_ACTIONS,
} from './customs-trade.constants';
import {
  FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS,
  PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS,
} from './customs-trade-schema.constants';

describe('Customs & Trade invariants', () => {
  it('distinguishes declaration submission from release', () => {
    expect(CUSTOMS_BOUNDARY_DISCLAIMER).toContain('do not by themselves authorize cargo release');
  });

  it('distinguishes payment from release', () => {
    expect(CUSTOMS_PAYMENT_BOUNDARY_DISCLAIMER).toContain('does not release cargo');
  });

  it('forbids client protected assessment fields', () => {
    expect(FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS).toContain('status');
    expect(FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS).toContain('issuedByOfficeholderId');
  });

  it('forbids AI consequential customs actions', () => {
    expect(FORBIDDEN_AI_CUSTOMS_ACTIONS).toContain('AUTHORIZE_RELEASE');
  });

  it('defines reason codes for mandatory scenarios', () => {
    expect(CUSTOMS_REASON_CODES.CROSS_COMPANY_DENIED).toBeDefined();
    expect(CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE).toBeDefined();
    expect(CUSTOMS_REASON_CODES.MANDATORY_PERMIT_BLOCKS).toBeDefined();
  });

  it('restricts public verification response keys', () => {
    expect(PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS).toContain('declarationData');
    expect(PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS).toContain('amountCents');
  });

  it('documents AI boundary disclaimer', () => {
    expect(CUSTOMS_AI_BOUNDARY_DISCLAIMER).toContain('cannot authorize release');
  });
});
