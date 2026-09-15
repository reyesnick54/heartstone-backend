import { PHASE_13F_INVARIANTS } from './phase-13f-invariants.constants';
import { PHASE_13F_INVARIANTS as PHASE_13F_FLAGS } from './production-readiness.constants';

describe('Phase 13F invariants registry', () => {
  it('defines numbered invariants', () => {
    expect(PHASE_13F_INVARIANTS.length).toBeGreaterThanOrEqual(14);
    expect(PHASE_13F_INVARIANTS[0]?.id).toBe(1);
  });

  it('covers attendance vs competence distinction', () => {
    const invariant = PHASE_13F_INVARIANTS.find((item) => item.id === 1);
    expect(invariant?.description).toContain('Attendance');
    expect(PHASE_13F_FLAGS.attendanceNotCompetence).toBe(true);
  });

  it('covers AI qualification prohibition', () => {
    const invariant = PHASE_13F_INVARIANTS.find((item) => item.id === 12);
    expect(invariant?.description).toContain('AI');
    expect(PHASE_13F_FLAGS.aiCannotQualifyOperator).toBe(true);
  });

  it('covers department self-activation prohibition', () => {
    const invariant = PHASE_13F_INVARIANTS.find((item) => item.id === 14);
    expect(invariant?.description).toContain('activate itself');
    expect(PHASE_13F_FLAGS.departmentCannotSelfActivate).toBe(true);
  });
});
