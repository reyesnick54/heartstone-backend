export const REPORTING_NUMBER_PREFIX = 'RPT';
export const REPORT_RUN_PREFIX = 'RRUN';
export const TRACE_NUMBER_PREFIX = 'TRACE';

export const REPORTING_DISCLAIMER =
  'Report content is derived from pinned metric calculations, approved institutional metric claims, and evidence manifests at the stated data cutoff. A generated sentence is not automatically an official claim.';

export const PUBLIC_STATISTICS_DISCLAIMER =
  'HeartStone/ABSEZ performance data must not be represented as official national Government statistics unless authenticated adoption or confirmation exists.';

export const ADVERSE_FINDING_DISCLAIMER =
  'Reports may not suppress unfavorable or neutral findings merely to create a positive narrative. Outcome classifications must be explicit.';

export const FORBIDDEN_CLIENT_REPORT_FIELDS = [
  'status',
  'frozenContent',
  'contentHash',
  'frozenSnapshotHash',
  'publishedAt',
  'isOfficialClaim',
  'governmentStatisticConfirmed',
  'representsGovernmentStatistic',
] as const;

export const FORBIDDEN_AI_REPORTING_ACTIONS = [
  'APPROVE_PUBLICATION',
  'APPROVE_REPORT',
  'PUBLISH_REPORT',
  'AUTHORIZE_CORRECTION',
] as const;

export const PROTECTED_CASE_DETAIL_FIELDS = [
  'applicantNationalId',
  'protectedPartyName',
  'victimIdentity',
  'childIdentity',
  'medicalRecordReference',
  'internalInvestigationStrategy',
  'confidentialReferralStrategy',
] as const;

export const ABSEZ_PLATFORM_MARKER = 'ABSEZ';
