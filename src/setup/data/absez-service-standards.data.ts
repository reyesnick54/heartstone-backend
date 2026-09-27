/** Protocol-defined service standards (policy configuration for S12 timers). */
export interface AbsezServiceStandardDefinition {
  code: string;
  label: string;
  targetDurationHours?: number;
  targetDurationDays?: number;
  businessDaysOnly: boolean;
  protocolReference: string;
  policyConfiguration: Record<string, unknown>;
}

export const ABSEZ_SERVICE_STANDARDS: readonly AbsezServiceStandardDefinition[] = [
  {
    code: 'ABSEZ-STD-72H',
    label: 'Implementation Protocol — 72-hour standard',
    targetDurationHours: 72,
    businessDaysOnly: true,
    protocolReference: 'Implementation Protocol — 72-hour service standard',
    policyConfiguration: {
      clockUnit: 'BUSINESS_HOURS',
      pauseOnApplicantHold: true,
      consumedBy: 'S12_SLA_RUNTIME',
    },
  },
  {
    code: 'ABSEZ-STD-24H',
    label: 'Implementation Protocol — 24-hour standard',
    targetDurationHours: 24,
    businessDaysOnly: false,
    protocolReference: 'Implementation Protocol — 24-hour service standard',
    policyConfiguration: {
      clockUnit: 'CALENDAR_HOURS',
      pauseOnApplicantHold: true,
      consumedBy: 'S12_SLA_RUNTIME',
    },
  },
  {
    code: 'ABSEZ-STD-5D',
    label: 'Implementation Protocol — 5-day standard',
    targetDurationDays: 5,
    businessDaysOnly: true,
    protocolReference: 'Implementation Protocol — 5-day service standard',
    policyConfiguration: {
      clockUnit: 'BUSINESS_DAYS',
      pauseOnApplicantHold: true,
      consumedBy: 'S12_SLA_RUNTIME',
    },
  },
] as const;
