import {
  AuthorityClassification,
  InstrumentIssuerSource,
  InstrumentJurisdictionScope,
  MetricDependencyTimeClassification,
} from '@prisma/client';

import {
  isOperatingInstitutionIssuedSource,
  isOperatingJurisdictionScope,
  normalizeAuthorityClassification,
  normalizeInstrumentIssuerSource,
  normalizeMetricDependencyTimeClassification,
  resolveDefaultInstrumentIssuerSource,
} from './institution-neutral-enums.util';

describe('institution-neutral-enums.util', () => {
  it('normalizes legacy authority classifications', () => {
    expect(normalizeAuthorityClassification(AuthorityClassification.ABSEZ_OWNED)).toBe(
      AuthorityClassification.INSTITUTION_OWNED,
    );
    expect(normalizeAuthorityClassification(AuthorityClassification.INSTITUTION_DELEGATED)).toBe(
      AuthorityClassification.INSTITUTION_DELEGATED,
    );
  });

  it('normalizes legacy issuer sources and defaults', () => {
    expect(normalizeInstrumentIssuerSource(InstrumentIssuerSource.ABSEZ_ISSUED)).toBe(
      InstrumentIssuerSource.INSTITUTION_ISSUED,
    );
    expect(resolveDefaultInstrumentIssuerSource()).toBe(InstrumentIssuerSource.INSTITUTION_ISSUED);
    expect(isOperatingInstitutionIssuedSource(InstrumentIssuerSource.INSTITUTION_ISSUED)).toBe(
      true,
    );
  });

  it('treats legacy ABSEZ jurisdiction scope as operating jurisdiction', () => {
    expect(isOperatingJurisdictionScope(InstrumentJurisdictionScope.ABSEZ)).toBe(true);
    expect(isOperatingJurisdictionScope(InstrumentJurisdictionScope.NATIONAL)).toBe(false);
  });

  it('normalizes legacy metric dependency time classifications', () => {
    expect(
      normalizeMetricDependencyTimeClassification(
        MetricDependencyTimeClassification.ABSEZ_CONTROLLED_TIME,
      ),
    ).toBe(MetricDependencyTimeClassification.INSTITUTION_CONTROLLED_TIME);
  });
});
