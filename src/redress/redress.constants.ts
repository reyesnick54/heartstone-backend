export const COMPLAINT_NUMBER_PREFIX = 'CMP';
export const SUBSTANTIVE_APPEAL_NUMBER_PREFIX = 'APL';

export const OPEN_SUBSTANTIVE_APPEAL_STATUSES = [
  'LODGED',
  'ACKNOWLEDGED',
  'UNDER_ADJUDICATION',
] as const;

export const ACTIVE_COMPLAINT_STATUSES = [
  'RECEIVED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'UNDER_INVESTIGATION',
  'AWAITING_RESPONSE',
  'REMEDY_PENDING',
  'ESCALATED',
] as const;

export const PROFESSIONAL_CONDUCT_ESCALATION_TARGET = 'PROFESSIONAL_BODY' as const;
export const PRIVACY_ESCALATION_TARGET = 'PRIVACY_COMMISSIONER' as const;
export const SECURITY_ESCALATION_TARGET = 'SECURITY_INCIDENT_TEAM' as const;

export const RESTRICTED_EVIDENCE_ACCESS_LEVELS = ['RESTRICTED', 'INTERNAL'] as const;

export const FORBIDDEN_CLIENT_COMPLAINT_FIELDS = [
  'isFactualFinding',
  'mayReverseFinalDecision',
  'affectsRiskScore',
  'isSubstantiveAppealOutcome',
  'doesNotAlterDecisionAuthority',
  'evidencePreserved',
  'decisionHistoryPreserved',
import { RedressRouteCategory } from '@prisma/client';

export const REDRESS_MATTER_NUMBER_PREFIX = 'RM';

export const REDRESS_FILING_NUMBER_PREFIX = 'RF';

export const REDRESS_DECISION_NUMBER_PREFIX = 'RD';

export const PHASE_10H_BOUNDARY_DISCLAIMER =
  'Phase 10 records complaints, reconsideration, appeals, and redress proceedings. Filing, classification, and investigation do not establish standing, timeliness, or final disposition. AI assistance cannot adjudicate redress matters.';

export const FORBIDDEN_CLIENT_REDIST_FIELDS = [
  'status',
  'safeHaltReason',
  'safeHaltAt',
  'closedAt',
  'routeVersionId',
  'classifiedRouteCategory',
  'standingOutcome',
  'timelinessOutcome',
  'isFinalDisposition',
  'isImplemented',
  'isRecommendation',
  'deciderIdentityId',
  'deciderOfficeholderId',
  'authorityEvaluationRecordId',
  'originalDecisionPreserved',
  'stayGranted',
  'isBlocked',
  'aiAdjudicated',
  'altersSubstantiveOutcome',
  'altersMaterialReasons',
  'removesReviewRights',
  'isSubstantive',
  'isAppealMislabel',
  'authenticity',
  'markedImplementedAt',
  'isPrivileged',
] as const;

export interface Phase10HInvariant {
  id: number;
  description: string;
  category: string;
}

export const PHASE_10H_INVARIANTS: readonly Phase10HInvariant[] = [
  { id: 1, category: 'boundary', description: 'Complaint does not equal appeal' },
  { id: 2, category: 'boundary', description: 'Filing does not establish standing' },
  { id: 3, category: 'boundary', description: 'AI assistance does not equal redress decision' },
  { id: 4, category: 'boundary', description: 'Access does not equal authority to review' },
  { id: 5, category: 'boundary', description: 'Classification does not equal disposition' },
  {
    id: 6,
    category: 'boundary',
    description: 'Service complaint route does not permit substantive reversal',
  },
  {
    id: 7,
    category: 'boundary',
    description: 'Administrative correction does not alter substantive outcome',
  },
  { id: 8, category: 'boundary', description: 'Clarification does not alter substantive decision' },
  {
    id: 9,
    category: 'boundary',
    description: 'Recommendation does not equal final redress disposition',
  },
  {
    id: 10,
    category: 'boundary',
    description: 'Timeliness assessment does not equal standing assessment',
  },
  {
    id: 11,
    category: 'boundary',
    description: 'Internal review is distinct from statutory appeal',
  },
  {
    id: 12,
    category: 'boundary',
    description: 'Reconsideration preserves original decision record',
  },
  {
    id: 13,
    category: 'boundary',
    description: 'External referral does not equal domestic disposition',
  },
  {
    id: 14,
    category: 'boundary',
    description: 'Interim relief request does not auto-grant stay',
  },
  { id: 15, category: 'boundary', description: 'Route filing does not auto-classify' },
  {
    id: 16,
    category: 'boundary',
    description: 'Acknowledgment does not establish review jurisdiction',
  },
  {
    id: 17,
    category: 'boundary',
    description: 'Investigation finding does not equal final disposition',
  },
  {
    id: 18,
    category: 'boundary',
    description: 'Service remedy does not equal substantive reversal',
  },
  {
    id: 19,
    category: 'boundary',
    description: 'Original government decision preserved during redress',
  },
  {
    id: 20,
    category: 'boundary',
    description: 'Filing submission does not bypass route eligibility',
  },
  { id: 21, category: 'client', description: 'Client cannot set redress matter status' },
  { id: 22, category: 'client', description: 'Client cannot set safe halt reason' },
  { id: 23, category: 'client', description: 'Client cannot set classified route category' },
  { id: 24, category: 'client', description: 'Client cannot set standing outcome' },
  { id: 25, category: 'client', description: 'Client cannot set timeliness outcome' },
  { id: 26, category: 'client', description: 'Client cannot set isFinalDisposition' },
  { id: 27, category: 'client', description: 'Client cannot set isImplemented on decisions' },
  { id: 28, category: 'client', description: 'Client cannot set decider identity fields' },
  {
    id: 29,
    category: 'client',
    description: 'Client cannot set authorityEvaluationRecordId',
  },
  { id: 30, category: 'client', description: 'Client cannot set stayGranted' },
  { id: 31, category: 'client', description: 'Client cannot set reviewer blocked status' },
  { id: 32, category: 'client', description: 'Client cannot set aiAdjudicated' },
  { id: 33, category: 'client', description: 'Client cannot set altersSubstantiveOutcome' },
  { id: 34, category: 'client', description: 'Client cannot set removesReviewRights' },
  { id: 35, category: 'client', description: 'Client cannot set notice privileged flag' },
  {
    id: 36,
    category: 'authority',
    description: 'Non-human actors cannot record redress dispositions',
  },
  {
    id: 37,
    category: 'authority',
    description: 'AI actors cannot uphold, reverse, or dismiss redress matters',
  },
  {
    id: 38,
    category: 'authority',
    description: 'Standing assessment requires authority evaluation ALLOW',
  },
  {
    id: 39,
    category: 'authority',
    description: 'Timeliness assessment requires authority evaluation ALLOW',
  },
  {
    id: 40,
    category: 'authority',
    description: 'Redress disposition requires HEAR_REVIEW authority evaluation ALLOW',
  },
  {
    id: 41,
    category: 'authority',
    description: 'Deadline extension decision requires authority evaluation ALLOW',
  },
  {
    id: 42,
    category: 'authority',
    description: 'Interim stay requires explicit authorized action',
  },
  {
    id: 43,
    category: 'authority',
    description: 'Automation challenge disposition requires human authority',
  },
  {
    id: 44,
    category: 'authority',
    description: 'External determination implementation requires authority evaluation',
  },
  {
    id: 45,
    category: 'authority',
    description: 'Fresh authority evaluation required for each redress disposition',
  },
  {
    id: 46,
    category: 'authority',
    description: 'Stale authority evaluation cannot support new disposition',
  },
  {
    id: 47,
    category: 'authority',
    description: 'Review assignment requires valid appointment',
  },
  {
    id: 48,
    category: 'authority',
    description: 'Representative filing requires active representative authority',
  },
  {
    id: 49,
    category: 'authority',
    description: 'Technical access does not confer review authority',
  },
  {
    id: 50,
    category: 'authority',
    description: 'Case manager role does not confer redress disposition authority',
  },
  {
    id: 51,
    category: 'route',
    description: 'Mislabeled appeal filed as complaint must be rejected or reclassified',
  },
  {
    id: 52,
    category: 'route',
    description: 'Requested route category must match route definition category',
  },
  {
    id: 53,
    category: 'route',
    description: 'Inactive route version cannot accept new filings',
  },
  {
    id: 54,
    category: 'route',
    description: 'Superseded route version triggers safe halt on active matters',
  },
  {
    id: 55,
    category: 'route',
    description: 'Non-substantive correction route forbids substantive remedy',
  },
  {
    id: 56,
    category: 'review',
    description: 'Original decision-maker blocked from review assignment',
  },
  {
    id: 57,
    category: 'review',
    description: 'Reviewer independence must be established before proceeding',
  },
  {
    id: 58,
    category: 'review',
    description: 'Review record snapshot pinned before substantive review',
  },
  {
    id: 59,
    category: 'review',
    description: 'Later evidence separated from pinned snapshot',
  },
  {
    id: 60,
    category: 'review',
    description: 'Snapshot immutability preserved after pinning',
  },
  {
    id: 61,
    category: 'ai',
    description: 'Automation challenge requires explanation disclosure before disposition',
  },
  { id: 62, category: 'ai', description: 'Faulty AI output excluded from authoritative record' },
  { id: 63, category: 'ai', description: 'AI cannot adjudicate automation challenges' },
  {
    id: 64,
    category: 'implementation',
    description: 'Implementation cannot be marked complete before all actions complete',
  },
  {
    id: 65,
    category: 'implementation',
    description: 'Phase 8 controlled updates require explicit action type',
  },
  {
    id: 66,
    category: 'implementation',
    description: 'Phase 9 controlled updates require explicit action type',
  },
  {
    id: 67,
    category: 'implementation',
    description: 'Implementation failure remains visible to oversight',
  },
  {
    id: 68,
    category: 'safe-halt',
    description: 'Unresolved authority triggers safe halt',
  },
  {
    id: 69,
    category: 'safe-halt',
    description: 'Invalid reviewer appointment triggers safe halt',
  },
  {
    id: 70,
    category: 'safe-halt',
    description: 'Evidence integrity compromise triggers safe halt',
  },
  {
    id: 71,
    category: 'external',
    description: 'External determination must be authenticated before implementation',
  },
  {
    id: 72,
    category: 'external',
    description: 'Unverified external determination cannot drive domestic disposition',
  },
  {
    id: 73,
    category: 'notice',
    description: 'Privileged investigation notes protected from ordinary disclosure',
  },
  {
    id: 74,
    category: 'notice',
    description: 'Notice issuance does not equal disposition recording',
  },
  {
    id: 75,
    category: 'notice',
    description: 'Safe halt prevents consequential redress actions until resolved',
  },
] as const;

export const REDRESS_ROUTE_CATEGORIES: readonly RedressRouteCategory[] = [
  RedressRouteCategory.ADMINISTRATIVE_CORRECTION,
  RedressRouteCategory.CLARIFICATION,
  RedressRouteCategory.SERVICE_COMPLAINT,
  RedressRouteCategory.CONDUCT_COMPLAINT,
  RedressRouteCategory.PRIVACY_SECURITY_COMPLAINT,
  RedressRouteCategory.AI_AUTOMATION_CHALLENGE,
  RedressRouteCategory.RECONSIDERATION,
  RedressRouteCategory.INTERNAL_ADMINISTRATIVE_REVIEW,
  RedressRouteCategory.STATUTORY_APPEAL,
  RedressRouteCategory.PROFESSIONAL_CHALLENGE,
  RedressRouteCategory.REGULATORY_REVIEW,
  RedressRouteCategory.OMBUDS_OVERSIGHT,
  RedressRouteCategory.JUDICIAL_REVIEW_COORDINATION,
] as const;

export const COMPLAINT_ROUTE_CATEGORIES: readonly RedressRouteCategory[] = [
  RedressRouteCategory.SERVICE_COMPLAINT,
  RedressRouteCategory.CONDUCT_COMPLAINT,
  RedressRouteCategory.PRIVACY_SECURITY_COMPLAINT,
] as const;

export const APPEAL_ROUTE_CATEGORIES: readonly RedressRouteCategory[] = [
  RedressRouteCategory.RECONSIDERATION,
  RedressRouteCategory.INTERNAL_ADMINISTRATIVE_REVIEW,
  RedressRouteCategory.STATUTORY_APPEAL,
  RedressRouteCategory.PROFESSIONAL_CHALLENGE,
  RedressRouteCategory.REGULATORY_REVIEW,
  RedressRouteCategory.OMBUDS_OVERSIGHT,
  RedressRouteCategory.JUDICIAL_REVIEW_COORDINATION,
] as const;

export const FORBIDDEN_AI_REDIST_ACTIONS = [
  'UPHOLD',
  'REVERSE',
  'DISMISS',
  'VARIED',
  'ADJUDICATE',
  'DECIDE',
  'GRANT_STAY',
] as const;
