export interface AppendixGMetricDefinition {
  metricCode: string;
  label: string;
  description: string;
}

export const APPENDIX_G_METRIC_DEFINITIONS: AppendixGMetricDefinition[] = [
  {
    metricCode: 'APPLICATIONS_RECEIVED',
    label: 'Applications received',
    description: 'Count of applications submitted during the reporting period.',
  },
  {
    metricCode: 'CASES_OPEN',
    label: 'Open cases',
    description: 'Cases open at any point during the reporting period.',
  },
  {
    metricCode: 'DECISIONS_RECORDED',
    label: 'Decisions recorded',
    description: 'Formal government decisions recorded during the reporting period.',
  },
  {
    metricCode: 'PAYMENTS_SETTLED',
    label: 'Payments settled',
    description: 'Settled payment transactions linked to institution fee assessments.',
  },
  {
    metricCode: 'INSPECTIONS_COMPLETED',
    label: 'Inspections completed',
    description: 'Completed inspection events during the reporting period.',
  },
];
