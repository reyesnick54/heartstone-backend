import {
  AuthorityClassification,
  InstrumentIssuerSource,
  InstrumentJurisdictionScope,
  MetricDependencyTimeClassification,
} from '@prisma/client';

/** Normalize legacy ABSEZ-specific enum values to institution-neutral equivalents. */
export function normalizeAuthorityClassification(
  classification: AuthorityClassification,
): AuthorityClassification {
  switch (classification) {
    case AuthorityClassification.ABSEZ_OWNED:
      return AuthorityClassification.INSTITUTION_OWNED;
    case AuthorityClassification.ABSEZ_DELEGATED:
      return AuthorityClassification.INSTITUTION_DELEGATED;
    default:
      return classification;
  }
}

export function isInstitutionOwnedClassification(
  classification: AuthorityClassification,
): boolean {
  const normalized = normalizeAuthorityClassification(classification);
  return normalized === AuthorityClassification.INSTITUTION_OWNED;
}

export function isInstitutionDelegatedClassification(
  classification: AuthorityClassification,
): boolean {
  const normalized = normalizeAuthorityClassification(classification);
  return normalized === AuthorityClassification.INSTITUTION_DELEGATED;
}

export function normalizeInstrumentIssuerSource(
  source: InstrumentIssuerSource,
): InstrumentIssuerSource {
  if (source === InstrumentIssuerSource.ABSEZ_ISSUED) {
    return InstrumentIssuerSource.INSTITUTION_ISSUED;
  }
  return source;
}

export function isOperatingInstitutionIssuedSource(source: InstrumentIssuerSource): boolean {
  const normalized = normalizeInstrumentIssuerSource(source);
  return normalized === InstrumentIssuerSource.INSTITUTION_ISSUED;
}

export function resolveDefaultInstrumentIssuerSource(
  explicit?: InstrumentIssuerSource | null,
): InstrumentIssuerSource {
  if (explicit) {
    return normalizeInstrumentIssuerSource(explicit);
  }
  return InstrumentIssuerSource.INSTITUTION_ISSUED;
}

export function normalizeInstrumentJurisdictionScope(
  scope: InstrumentJurisdictionScope,
): InstrumentJurisdictionScope {
  if (scope === InstrumentJurisdictionScope.ABSEZ) {
    return InstrumentJurisdictionScope.OPERATING_JURISDICTION;
  }
  return scope;
}

export function isOperatingJurisdictionScope(scope: InstrumentJurisdictionScope): boolean {
  const normalized = normalizeInstrumentJurisdictionScope(scope);
  return normalized === InstrumentJurisdictionScope.OPERATING_JURISDICTION;
}

export function normalizeMetricDependencyTimeClassification(
  classification: MetricDependencyTimeClassification,
): MetricDependencyTimeClassification {
  if (classification === MetricDependencyTimeClassification.ABSEZ_CONTROLLED_TIME) {
    return MetricDependencyTimeClassification.INSTITUTION_CONTROLLED_TIME;
  }
  return classification;
}

export function isInstitutionControlledProcessingTime(
  classification: MetricDependencyTimeClassification,
): boolean {
  const normalized = normalizeMetricDependencyTimeClassification(classification);
  return normalized === MetricDependencyTimeClassification.INSTITUTION_CONTROLLED_TIME;
}
