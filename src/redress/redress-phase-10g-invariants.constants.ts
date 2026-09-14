export interface Phase10GInvariant {
  id: number;
  description: string;
}

export const PHASE_10G_INVARIANTS: Phase10GInvariant[] = [
  {
    id: 1,
    description:
      'Filing an appeal does not create an automatic stay unless route configuration explicitly permits it',
  },
  { id: 2, description: 'Stay requires explicit rule or decision where not automatic' },
  { id: 3, description: 'Stay is not a reversal' },
  { id: 4, description: 'RedressDecision requires fresh authority evaluation' },
  { id: 5, description: 'AI cannot make final redress decisions' },
  { id: 6, description: 'Original GovernmentDecision is preserved after reversal or set-aside' },
  { id: 7, description: 'Remand preserves history and original decision status' },
  { id: 8, description: 'Instrument remedy changes invoke Phase 8 lifecycle services' },
  { id: 9, description: 'Public verification updates only after implemented remedy' },
  { id: 10, description: 'Successful appeal is not shown implemented until actions complete' },
  { id: 11, description: 'Failure implementing remedy remains visible' },
  { id: 12, description: 'Further review rights are derived from route configuration only' },
  { id: 13, description: 'Original reviewer cannot self-review where independence is required' },
  { id: 14, description: 'Client cannot choose arbitrary remedy types' },
  { id: 15, description: 'Technical admin cannot create RedressDecision' },
  { id: 16, description: 'Route-restricted outcomes cannot use a global outcome catalog' },
  { id: 17, description: 'RedressDecision remains valid even when implementation is blocked' },
];
