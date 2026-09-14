export interface Phase12FInvariant {
  id: number;
  description: string;
}

export const PHASE_12F_INVARIANTS: Phase12FInvariant[] = [
  { id: 1, description: 'Digital twin is not an authoritative government record' },
  { id: 2, description: 'Simulation cannot mutate live authoritative records' },
  { id: 3, description: 'Simulation cannot issue a license' },
  { id: 4, description: 'Simulation cannot change project stage' },
  { id: 5, description: 'Simulation cannot send public event notice as real' },
  { id: 6, description: 'Scenario cannot be presented as prediction' },
  { id: 7, description: 'Modeled dependency is not an observed fact' },
  { id: 8, description: 'Stale twin blocks consequential use' },
  { id: 9, description: 'Missing source data must be disclosed before consequential use' },
  { id: 10, description: 'AI/twin assistance cannot final-decide consequential use' },
  { id: 11, description: 'Live transition requires separate institutional acceptance' },
  { id: 12, description: 'Twin owner cannot be the twin itself' },
  {
    id: 13,
    description: 'Applicant/case twin cannot become an uncontrolled personal profile',
  },
  { id: 14, description: 'Twin snapshot is immutable once recorded' },
  { id: 15, description: 'Rollback path is required for simulation-to-live transition' },
  { id: 16, description: 'Technical success does not equal live activation' },
  { id: 17, description: 'APPROVED_LIVE_REFERENCE is not operational control authority' },
];
