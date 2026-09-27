export const CASE_MANAGER_ASSIGNMENT_ROLE = 'CASE_MANAGER' as const;

export const S16_BOUNDARY_DISCLAIMERS = {
  caseManagerNotDecisionAuthority:
    'Case manager assignment is operational coordination only and does not confer legal decision authority.',
  coordinationNotMandateExtension:
    'Cross-agency coordination records do not extend the receiving institution mandate beyond its own authority.',
  correctiveActionNotEnforcement:
    'Corrective action administration is not automatic enforcement; suspension, revocation, and sanctions require the consequential authority path.',
  renewalReminderNotRenewal:
    'Renewal reminders and fee receipt do not renew a government instrument without the configured workflow and controlling decision.',
} as const;

export const OPERATIONAL_JOB_CODES = {
  INSTRUMENT_RENEWAL_REMINDERS: 'INSTRUMENT_RENEWAL_REMINDERS',
} as const;
