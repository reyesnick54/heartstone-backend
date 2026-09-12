export const EVIDENCE_BOUNDARY_DISCLAIMER =
  'Evidence records preserve institutional inputs for case review. They do not constitute government decisions, approvals, or enforcement findings by themselves.';

export const GOVERNMENT_COMMUNICATION_NON_APPROVAL_CATEGORIES = [
  'RECEIPT',
  'ACKNOWLEDGMENT',
  'INFORMATION',
  'GUIDANCE',
  'CONSULTATION',
] as const;

export const GOVERNMENT_COMMUNICATION_CONSEQUENCE_CATEGORIES = [
  'CONCURRENCE',
  'OBJECTION',
  'RETAINED_DETERMINATION',
  'SUPERVISORY_FINDING',
] as const;

export const PHASE_7D_MODEL_NAMES = [
  'DocumentRecord',
  'EvidenceRecord',
  'DepartmentalReviewRecord',
  'GovernmentCommunicationRecord',
  'ProfessionalReviewRecord',
  'InspectionRecord',
  'InspectionEvidenceItem',
  'EvidenceCustodyEvent',
] as const;
