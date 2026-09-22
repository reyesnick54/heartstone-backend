import {
  CUSTOMS_BOUNDARY_DISCLAIMER,
  CUSTOMS_PAYMENT_BOUNDARY_DISCLAIMER,
  CUSTOMS_REASON_CODES,
  CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS,
  FORBIDDEN_AI_CUSTOMS_ACTIONS,
} from './customs-trade.constants';
import {
  FORBIDDEN_CUSTOMS_DECLARATION_CLIENT_FIELDS,
  PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS,
} from './customs-trade-schema.constants';

describe('Customs & Trade invariants', () => {
  it('distinguishes declaration submission from release', () => {
    expect(CUSTOMS_BOUNDARY_DISCLAIMER).toContain('do not by themselves authorize cargo release');
  });

  it('distinguishes payment from release', () => {
    expect(CUSTOMS_PAYMENT_BOUNDARY_DISCLAIMER).toContain('does not release cargo');
  });

  it('forbids client protected declaration fields', () => {
    expect(FORBIDDEN_CUSTOMS_DECLARATION_CLIENT_FIELDS).toContain('status');
    expect(FORBIDDEN_CUSTOMS_DECLARATION_CLIENT_FIELDS).toContain('currentVersionId');
  });

  it('forbids AI consequential customs actions', () => {
    expect(FORBIDDEN_AI_CUSTOMS_ACTIONS).toContain('EXECUTE_CARGO_RELEASE');
  });

  it('requires configured release condition keys', () => {
    expect(CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS).toContain('reviewsComplete');
    expect(CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS).toContain('officialReleaseAuthority');
    expect(CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS).toContain('holdsCleared');
  });

  it('defines reason codes for mandatory scenarios', () => {
    expect(CUSTOMS_REASON_CODES.CROSS_SHIPMENT_ACCESS_DENIED).toBeDefined();
    expect(CUSTOMS_REASON_CODES.BROKER_SCOPE_REQUIRED).toBeDefined();
    expect(CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE).toBeDefined();
    expect(CUSTOMS_REASON_CODES.PUBLIC_CONFIDENTIAL_FIELD_FORBIDDEN).toBeDefined();
  });

  it('restricts public verification response keys', () => {
    expect(PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS).toContain('declarationData');
    expect(PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS).toContain('amountCents');
  });
});
