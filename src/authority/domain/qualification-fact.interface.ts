import { type QualificationFact } from './authority-evaluation-context';

/**
 * Minimal future-compatible interface for external qualification registries.
 * Phase 4D does not implement the full professional registry.
 */
export interface QualificationFactProvider {
  getQualificationStatus(
    qualificationCode: string,
    actorIdentityId: string,
  ): QualificationFact | null;
}
