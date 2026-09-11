import { type EvidenceRequirementFact } from './authority-evaluation-context';

/**
 * Minimal future-compatible interface for external evidence systems.
 * Phase 4D does not implement the full Evidence Engine.
 */
export interface EvidenceFactProvider {
  getEvidenceStatus(evidenceId: string, caseReference?: string): EvidenceRequirementFact | null;
}
