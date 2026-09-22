import {
  CLINICAL_RESEARCH_BOUNDARY_DISCLAIMER,
  CLINICAL_RESEARCH_INVARIANTS,
  CLINICAL_RESEARCH_MATCHING_DISCLAIMER,
  FORBIDDEN_AI_CLINICAL_RESEARCH_ACTIONS,
  FORBIDDEN_PRELIMINARY_MATCH_OUTCOMES,
} from './clinical-research.constants';

describe('Clinical research invariants registry', () => {
  it('distinguishes trial listing from regulatory approval', () => {
    expect(CLINICAL_RESEARCH_INVARIANTS.trialListingNotRegulatoryApproval).toBe(true);
    expect(CLINICAL_RESEARCH_BOUNDARY_DISCLAIMER).toContain('regulatory authorization');
  });

  it('distinguishes discovery from recommendation', () => {
    expect(CLINICAL_RESEARCH_INVARIANTS.discoveryNotRecommendation).toBe(true);
  });

  it('distinguishes preliminary match from clinical eligibility', () => {
    expect(CLINICAL_RESEARCH_INVARIANTS.preliminaryMatchNotClinicalEligibility).toBe(true);
    expect(CLINICAL_RESEARCH_MATCHING_DISCLAIMER).toContain('not a clinical eligibility');
    expect(FORBIDDEN_PRELIMINARY_MATCH_OUTCOMES).toContain('ELIGIBLE');
  });

  it('forbids AI from consequential clinical research determinations', () => {
    expect(FORBIDDEN_AI_CLINICAL_RESEARCH_ACTIONS).toContain('FINALIZE_ELIGIBILITY');
    expect(FORBIDDEN_AI_CLINICAL_RESEARCH_ACTIONS).toContain('DETERMINE_CLINICAL_ELIGIBILITY');
  });

  it('preserves enrollment prerequisites and history boundaries', () => {
    expect(CLINICAL_RESEARCH_INVARIANTS.consentNotEnrollment).toBe(true);
    expect(CLINICAL_RESEARCH_INVARIANTS.eligibilityNotEnrollment).toBe(true);
    expect(CLINICAL_RESEARCH_INVARIANTS.withdrawalPreservesHistory).toBe(true);
    expect(CLINICAL_RESEARCH_INVARIANTS.ethicsApprovalNotRegulatoryApproval).toBe(true);
  });
});
