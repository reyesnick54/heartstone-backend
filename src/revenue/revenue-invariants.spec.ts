import {
  FORBIDDEN_AI_TAX_ACTIONS,
  REVENUE_AUDIT_BOUNDARY_DISCLAIMER,
  REVENUE_BOUNDARY_DISCLAIMER,
  REVENUE_PAYMENT_BOUNDARY_DISCLAIMER,
  REVENUE_REASON_CODES,
  REVENUE_REFUND_BOUNDARY_DISCLAIMER,
  TAX_CLEARANCE_REQUIRED_CONDITION_KEYS,
} from './revenue.constants';
import {
  FORBIDDEN_TAX_ASSESSMENT_CLIENT_FIELDS,
  FORBIDDEN_TAX_RETURN_CLIENT_FIELDS,
} from './revenue-schema.constants';

describe('Revenue invariants', () => {
  it('distinguishes return filing from assessment', () => {
    expect(REVENUE_BOUNDARY_DISCLAIMER).toContain('self-declaration');
    expect(REVENUE_BOUNDARY_DISCLAIMER).toContain('not constitute a tax assessment');
  });

  it('distinguishes payment from clearance', () => {
    expect(REVENUE_PAYMENT_BOUNDARY_DISCLAIMER).toContain(
      'does not create tax compliance clearance',
    );
  });

  it('distinguishes refund request from disbursement', () => {
    expect(REVENUE_REFUND_BOUNDARY_DISCLAIMER).toContain('disbursement require separate');
  });

  it('distinguishes audit matter from violation proof', () => {
    expect(REVENUE_AUDIT_BOUNDARY_DISCLAIMER).toContain('does not by itself prove');
  });

  it('forbids client protected return fields', () => {
    expect(FORBIDDEN_TAX_RETURN_CLIENT_FIELDS).toContain('status');
    expect(FORBIDDEN_TAX_RETURN_CLIENT_FIELDS).toContain('currentVersionId');
  });

  it('forbids client protected assessment fields', () => {
    expect(FORBIDDEN_TAX_ASSESSMENT_CLIENT_FIELDS).toContain('status');
    expect(FORBIDDEN_TAX_ASSESSMENT_CLIENT_FIELDS).toContain('calculationRecordId');
  });

  it('forbids AI consequential tax actions', () => {
    expect(FORBIDDEN_AI_TAX_ACTIONS).toContain('ISSUE_TAX_ASSESSMENT');
    expect(FORBIDDEN_AI_TAX_ACTIONS).toContain('ISSUE_CLEARANCE_CERTIFICATE');
  });

  it('requires configured clearance condition keys', () => {
    expect(TAX_CLEARANCE_REQUIRED_CONDITION_KEYS).toContain('filingCurrent');
    expect(TAX_CLEARANCE_REQUIRED_CONDITION_KEYS).toContain('authorizedOfficerApproval');
  });

  it('defines reason codes for mandatory scenarios', () => {
    expect(REVENUE_REASON_CODES.CROSS_TAXPAYER_ACCESS_DENIED).toBeDefined();
    expect(REVENUE_REASON_CODES.SUBMITTED_RETURN_IMMUTABLE).toBeDefined();
    expect(REVENUE_REASON_CODES.AI_CANNOT_ISSUE_ASSESSMENT).toBeDefined();
    expect(REVENUE_REASON_CODES.CLEARANCE_CONDITIONS_NOT_MET).toBeDefined();
  });
});
