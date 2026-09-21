export const BUSINESS_ACTION_CODES = {
  SUBMIT_REQUESTED_INFORMATION: 'SUBMIT_REQUESTED_INFORMATION',
  RENEW_LICENSE: 'RENEW_LICENSE',
  SATISFY_COMPLIANCE_OBLIGATION: 'SATISFY_COMPLIANCE_OBLIGATION',
  RESPOND_TO_CORRECTIVE_ACTION: 'RESPOND_TO_CORRECTIVE_ACTION',
  PAY_INVOICE: 'PAY_INVOICE',
  RESPOND_TO_GOVERNMENT_CORRESPONDENCE: 'RESPOND_TO_GOVERNMENT_CORRESPONDENCE',
  COMPLETE_PROJECT_SUBMISSION: 'COMPLETE_PROJECT_SUBMISSION',
  SUBMIT_EMPLOYEE_DOCUMENTATION: 'SUBMIT_EMPLOYEE_DOCUMENTATION',
  RESPOND_TO_INSPECTION_REQUIREMENT: 'RESPOND_TO_INSPECTION_REQUIREMENT',
  INITIATE_APPEAL: 'INITIATE_APPEAL',
  COMPLETE_DRAFT_APPLICATION: 'COMPLETE_DRAFT_APPLICATION',
  PROVIDE_MISSING_INFORMATION: 'PROVIDE_MISSING_INFORMATION',
} as const;

export type BusinessActionCode = (typeof BUSINESS_ACTION_CODES)[keyof typeof BUSINESS_ACTION_CODES];

export const BUSINESS_ACTION_LABELS: Record<
  BusinessActionCode,
  { label: string; labelKey: string }
> = {
  [BUSINESS_ACTION_CODES.SUBMIT_REQUESTED_INFORMATION]: {
    label: 'Submit requested information',
    labelKey: 'business.action.submit_requested_information',
  },
  [BUSINESS_ACTION_CODES.RENEW_LICENSE]: {
    label: 'Renew license or permit',
    labelKey: 'business.action.renew_license',
  },
  [BUSINESS_ACTION_CODES.SATISFY_COMPLIANCE_OBLIGATION]: {
    label: 'Satisfy compliance obligation',
    labelKey: 'business.action.satisfy_compliance_obligation',
  },
  [BUSINESS_ACTION_CODES.RESPOND_TO_CORRECTIVE_ACTION]: {
    label: 'Respond to corrective action',
    labelKey: 'business.action.respond_to_corrective_action',
  },
  [BUSINESS_ACTION_CODES.PAY_INVOICE]: {
    label: 'Pay invoice',
    labelKey: 'business.action.pay_invoice',
  },
  [BUSINESS_ACTION_CODES.RESPOND_TO_GOVERNMENT_CORRESPONDENCE]: {
    label: 'Respond to government correspondence',
    labelKey: 'business.action.respond_to_government_correspondence',
  },
  [BUSINESS_ACTION_CODES.COMPLETE_PROJECT_SUBMISSION]: {
    label: 'Complete project submission',
    labelKey: 'business.action.complete_project_submission',
  },
  [BUSINESS_ACTION_CODES.SUBMIT_EMPLOYEE_DOCUMENTATION]: {
    label: 'Submit employee or work-permit documentation',
    labelKey: 'business.action.submit_employee_documentation',
  },
  [BUSINESS_ACTION_CODES.RESPOND_TO_INSPECTION_REQUIREMENT]: {
    label: 'Respond to inspection requirement',
    labelKey: 'business.action.respond_to_inspection_requirement',
  },
  [BUSINESS_ACTION_CODES.INITIATE_APPEAL]: {
    label: 'Initiate appeal or redress',
    labelKey: 'business.action.initiate_appeal',
  },
  [BUSINESS_ACTION_CODES.COMPLETE_DRAFT_APPLICATION]: {
    label: 'Complete draft application',
    labelKey: 'business.action.complete_draft_application',
  },
  [BUSINESS_ACTION_CODES.PROVIDE_MISSING_INFORMATION]: {
    label: 'Provide missing information',
    labelKey: 'business.action.provide_missing_information',
  },
};
