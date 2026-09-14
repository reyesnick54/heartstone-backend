export interface Phase11CInvariant {
  id: number;
  description: string;
}

export const PHASE_11C_INVARIANTS: Phase11CInvariant[] = [
  { id: 1, description: 'Waiver requires an approved route on FeeScheduleVersion' },
  { id: 2, description: 'AI cannot approve refund, waiver, write-off, payment, or public expenditure' },
  { id: 3, description: 'Technical admin cannot waive fees' },
  { id: 4, description: 'Refund cannot exceed refundable balance' },
  { id: 5, description: 'Duplicate refund is prevented' },
  { id: 6, description: 'Failed provider refund is not shown as settled' },
  { id: 7, description: 'Chargeback is not treated as authorized institutional refund' },
  { id: 8, description: 'Reconciliation mismatch is preserved without silent mutation' },
  { id: 9, description: 'System cannot fabricate missing bank records' },
  { id: 10, description: 'Arrears is a financial projection, not a sanction' },
  { id: 11, description: 'Payment dispute does not erase the underlying transaction' },
  { id: 12, description: 'Financial correction preserves the original record' },
  { id: 13, description: 'Financial adjustment cannot change GovernmentDecision' },
  { id: 14, description: 'Phase 10 refund remedy routes through Phase 11 payments' },
  { id: 15, description: 'Segregation of duties is enforced where configured' },
  { id: 16, description: 'Self-approval is blocked' },
  { id: 17, description: 'Payment and reference audit replay is possible' },
];
