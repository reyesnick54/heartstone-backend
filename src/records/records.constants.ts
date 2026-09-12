export const NON_PRODUCTION_RECORDS_FIXTURE_MARKER = 'NON_PRODUCTION_RECORDS';

export const MASTER_FILE_NUMBER_PREFIX = 'MAF';

export const MASTER_FILE_SECTION_DEFINITIONS = [
  {
    sectionType: 'FILE_CONTROL_AND_INDEX',
    sectionNumber: 1,
    title: 'File Control and Index',
  },
  {
    sectionType: 'AUTHORITY_AND_PROCEDURE',
    sectionNumber: 2,
    title: 'Authority and Procedure',
  },
  {
    sectionType: 'APPLICANT_AND_REPRESENTATION',
    sectionNumber: 3,
    title: 'Applicant and Representation',
  },
  {
    sectionType: 'APPLICATION_HISTORY',
    sectionNumber: 4,
    title: 'Application History',
  },
  {
    sectionType: 'SUPPORTING_EVIDENCE',
    sectionNumber: 5,
    title: 'Supporting Evidence',
  },
  {
    sectionType: 'COMPLETENESS_REVIEW',
    sectionNumber: 6,
    title: 'Completeness Review',
  },
  {
    sectionType: 'SUBSTANTIVE_REVIEW',
    sectionNumber: 7,
    title: 'Substantive Review',
  },
  {
    sectionType: 'GOVERNMENT_REFERRALS',
    sectionNumber: 8,
    title: 'Government Referrals',
  },
  {
    sectionType: 'PROFESSIONAL_REVIEWS',
    sectionNumber: 9,
    title: 'Professional Reviews',
  },
  {
    sectionType: 'INSPECTIONS',
    sectionNumber: 10,
    title: 'Inspections',
  },
  {
    sectionType: 'RECOMMENDATION_AND_DECISION',
    sectionNumber: 11,
    title: 'Recommendation and Decision',
  },
  {
    sectionType: 'ISSUANCE',
    sectionNumber: 12,
    title: 'Issuance',
  },
  {
    sectionType: 'CONDITIONS_AND_COMPLIANCE',
    sectionNumber: 13,
    title: 'Conditions and Compliance',
  },
  {
    sectionType: 'FEES_AND_FINANCIAL_RECORDS',
    sectionNumber: 14,
    title: 'Fees and Financial Records',
  },
  {
    sectionType: 'COMMUNICATIONS_AND_NOTICES',
    sectionNumber: 15,
    title: 'Communications and Notices',
  },
  {
    sectionType: 'CONTINUING_OBLIGATIONS_AND_MONITORING',
    sectionNumber: 16,
    title: 'Continuing Obligations and Monitoring',
  },
  {
    sectionType: 'COMPLAINT_RECONSIDERATION_APPEAL',
    sectionNumber: 17,
    title: 'Complaint, Reconsideration, and Appeal',
  },
  {
    sectionType: 'SUSPENSION_REVOCATION_ENFORCEMENT',
    sectionNumber: 18,
    title: 'Suspension, Revocation, and Enforcement',
  },
  {
    sectionType: 'CLOSURE_AND_ARCHIVE',
    sectionNumber: 19,
    title: 'Closure and Archive',
  },
  {
    sectionType: 'AUDIT_AND_TECHNICAL_HISTORY',
    sectionNumber: 20,
    title: 'Audit and Technical History',
  },
] as const;

export const RESTRICTED_MASTER_FILE_SECTION_TYPES = [
  'RECOMMENDATION_AND_DECISION',
  'ISSUANCE',
  'SUPPORTING_EVIDENCE',
] as const;

export const PHASE_7A_BOUNDARY_DISCLAIMER =
  'Phase 7A establishes the Master Administrative File index and institutional ownership. It does not upload documents, verify evidence, make decisions, or issue instruments.';

export const FORBIDDEN_MASTER_FILE_LIFECYCLE_STATUSES = ['APPROVED'] as const;
