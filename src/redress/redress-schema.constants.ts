export const PHASE_10C_MODEL_NAMES = [
  'ComplaintClassification',
  'ComplaintSafeguard',
  'ComplaintAssignment',
  'ComplaintInvestigation',
  'ComplaintInvestigationIssue',
  'ComplaintInvestigationEvidence',
  'ComplaintFinding',
  'ComplaintResponse',
  'ComplaintCorrectiveAction',
  'ComplaintEscalation',
  'ComplaintClosure',
] as const;

export const PHASE_10C_SUPPORT_MODEL_NAMES = [
  'Complaint',
  'ComplaintRetaliationAllegation',
  'ComplaintRelatedMatter',
  'SubstantiveAppeal',
] as const;

export const PHASE_10C_ENUM_NAMES = [
  'ComplaintCategory',
  'ComplaintStatus',
  'ComplaintSafeguardType',
  'ComplaintAssignmentStatus',
  'ComplaintInvestigationStatus',
  'ComplaintInvestigationIssueStatus',
  'ComplaintEvidenceType',
  'ComplaintEvidenceAccessLevel',
  'ComplaintFindingStatus',
  'ComplaintInvestigationFindingOutcome',
  'ComplaintRemedyType',
  'ComplaintEscalationTarget',
  'ComplaintClosureReason',
  'ComplaintPathwayActor',
  'RedressRelatedMatterType',
  'ComplaintPathwayScope',
  'SubstantiveAppealStatus',
] as const;

export const COMPLAINT_CATEGORIES = [
  'SERVICE_QUALITY',
  'DELAY',
  'STAFF_CONDUCT',
  'ACCESSIBILITY',
  'DISCRIMINATION_ALLEGATION',
  'PRIVACY',
  'SECURITY',
  'UNAUTHORIZED_DISCLOSURE',
  'CONFLICT_OF_INTEREST',
  'PROCEDURAL_UNFAIRNESS',
  'PROFESSIONAL_CONDUCT',
  'SYSTEM_MALFUNCTION',
  'REVIEW_ROUTE_ACCESS',
  'RETALIATION_ALLEGATION',
  'OTHER_AUTHORIZED_CATEGORY',
] as const;

export const COMPLAINT_FINDING_OUTCOMES = [
  'SUBSTANTIATED',
  'PARTIALLY_SUBSTANTIATED',
  'NOT_SUBSTANTIATED',
  'UNRESOLVED',
  'REFERRED',
  'OUTSIDE_SCOPE',
] as const;

export const COMPLAINT_REMEDY_TYPES = [
  'EXPLANATION',
  'APOLOGY',
  'SERVICE_CORRECTION',
  'ACCESS_RESTORATION',
  'PROCESS_CORRECTION',
  'STAFF_SUPERVISORY_REFERRAL',
  'PRIVACY_SECURITY_REMEDIATION',
  'RETRAINING',
  'SYSTEM_DEFECT_REMEDIATION',
  'ESCALATION',
  'REFERRAL',
  'RECOMMENDATION_FOR_RECONSIDERATION',
] as const;

export const COMPLAINT_SAFEGUARD_TYPES = [
  'CONFIDENTIAL_HANDLING',
  'RESTRICTED_ACCESS',
  'RETALIATION_PROTECTION',
  'URGENT_SAFETY_SECURITY_REFERRAL',
  'PRIVACY_INCIDENT_REFERRAL',
  'PRESERVATION_LEGAL_HOLD',
  'INDEPENDENT_HANDLER_REQUIRED',
] as const;
