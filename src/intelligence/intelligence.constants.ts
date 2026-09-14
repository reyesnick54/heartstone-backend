export const DASHBOARD_PROJECTION_DISCLAIMER =
  'Dashboard indicators are derived operational projections. Visibility does not create permission or institutional authority to act.';

export const DASHBOARD_STATUS_DISCLAIMER =
  'Displayed status labels and color semantics are presentation aids only. They do not establish legal compliance, violation findings, or enforcement decisions.';

export const DASHBOARD_STALE_DATA_DISCLAIMER =
  'Stale or cached indicator values remain visible with explicit staleness markers. Cached values are never presented as live data.';

export const FORBIDDEN_CLIENT_DASHBOARD_FIELDS = [
  'status',
  'countValue',
  'scoreValue',
  'currentStaleness',
  'dataQuality',
  'projectionVersion',
  'calculatedAt',
  'lastDerivedAt',
  'createsAuthority',
  'impliesApproval',
  'impliesIssuance',
] as const;

export const FORBIDDEN_STATUS_COLLAPSE_GROUPS = [
  ['RECOMMENDED', 'APPROVED', 'ISSUED'],
  ['REPORTED', 'VERIFIED', 'ACHIEVED'],
] as const;

export const FORBIDDEN_COLOR_LEGAL_MAPPINGS = [
  'GREEN = legally compliant',
  'RED = violation',
  'AMBER = Government concern',
] as const;

export const PHASE_12B_INVARIANTS = [
  'Dashboard visibility does not create authority to act',
  'Green indicator without evidence is blocked',
  'Technical admin is not automatically a substantive user',
  'Stale status remains visible',
  'Estimated, disputed, modeled, and external-reported data remain distinguishable',
  'Every material indicator drills to authoritative records',
  'Snapshots are immutable once captured',
  'Widgets cannot invent unsupported status dictionary entries',
  'Dashboard cannot collapse recommended/approved/issued',
  'Dashboard cannot collapse reported/verified/achieved',
] as const;
