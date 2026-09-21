export const CITIZEN_ACTION_CODES = {
  PROVIDE_MISSING_INFORMATION: 'PROVIDE_MISSING_INFORMATION',
  PAY_INVOICE: 'PAY_INVOICE',
  REVIEW_GOVERNMENT_MESSAGE: 'REVIEW_GOVERNMENT_MESSAGE',
  ACKNOWLEDGE_NOTICE: 'ACKNOWLEDGE_NOTICE',
  RENEW_INSTRUMENT: 'RENEW_INSTRUMENT',
  RESPOND_TO_REQUEST: 'RESPOND_TO_REQUEST',
  SUBMIT_APPEAL: 'SUBMIT_APPEAL',
  COMPLETE_DRAFT_APPLICATION: 'COMPLETE_DRAFT_APPLICATION',
} as const;

export type CitizenActionCode = (typeof CITIZEN_ACTION_CODES)[keyof typeof CITIZEN_ACTION_CODES];

export const CITIZEN_ACTION_LABELS: Record<CitizenActionCode, { label: string; labelKey: string }> =
  {
    [CITIZEN_ACTION_CODES.PROVIDE_MISSING_INFORMATION]: {
      label: 'Provide missing information',
      labelKey: 'citizen.action.provide_missing_information',
    },
    [CITIZEN_ACTION_CODES.PAY_INVOICE]: {
      label: 'Pay invoice',
      labelKey: 'citizen.action.pay_invoice',
    },
    [CITIZEN_ACTION_CODES.REVIEW_GOVERNMENT_MESSAGE]: {
      label: 'Review government message',
      labelKey: 'citizen.action.review_government_message',
    },
    [CITIZEN_ACTION_CODES.ACKNOWLEDGE_NOTICE]: {
      label: 'Acknowledge notice',
      labelKey: 'citizen.action.acknowledge_notice',
    },
    [CITIZEN_ACTION_CODES.RENEW_INSTRUMENT]: {
      label: 'Renew expiring instrument',
      labelKey: 'citizen.action.renew_instrument',
    },
    [CITIZEN_ACTION_CODES.RESPOND_TO_REQUEST]: {
      label: 'Respond to request',
      labelKey: 'citizen.action.respond_to_request',
    },
    [CITIZEN_ACTION_CODES.SUBMIT_APPEAL]: {
      label: 'Submit appeal or redress request',
      labelKey: 'citizen.action.submit_appeal',
    },
    [CITIZEN_ACTION_CODES.COMPLETE_DRAFT_APPLICATION]: {
      label: 'Complete draft application',
      labelKey: 'citizen.action.complete_draft_application',
    },
  };
