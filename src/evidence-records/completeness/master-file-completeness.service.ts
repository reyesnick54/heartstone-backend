import { Injectable } from '@nestjs/common';
import { EvidenceStatus, RecordIntegrityEventType } from '@prisma/client';

import { EVIDENCE_RECORDS_EXPLANATION_CODES } from '../evidence-records.constants';
import {
  type MasterFileCompletenessAssessment,
  type MasterFileCompletenessInput,
} from './master-file-completeness.types';

const INTEGRITY_FAILURE_TYPES: RecordIntegrityEventType[] = [
  RecordIntegrityEventType.HASH_MISMATCH,
  RecordIntegrityEventType.TAMPER_DETECTED,
  RecordIntegrityEventType.SEAL_BROKEN,
];

@Injectable()
export class MasterFileCompletenessService {
  assess(input: MasterFileCompletenessInput): MasterFileCompletenessAssessment {
    const explanationCodes: string[] = [];
    const integrityFailureCount = input.integrityEvents.filter((event) =>
      INTEGRITY_FAILURE_TYPES.includes(event.eventType as RecordIntegrityEventType),
    ).length;

    if (input.safeHalted || integrityFailureCount > 0) {
      if (integrityFailureCount > 0) {
        explanationCodes.push(EVIDENCE_RECORDS_EXPLANATION_CODES.INTEGRITY_MISMATCH_SAFE_HALT);
      }
      return {
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        outcome: 'SAFE_HALTED',
        requiredEvidenceCount: input.requiredRequirementCodes.length,
        satisfiedEvidenceCount: 0,
        disputedEvidenceCount: 0,
        unresolvedEvidenceCount: 0,
        integrityFailureCount,
        explanationCodes,
      };
    }

    const disputedEvidenceCount = input.evidenceRecords.filter(
      (record) => record.status === EvidenceStatus.DISPUTED,
    ).length;

    if (disputedEvidenceCount > 0) {
      explanationCodes.push(EVIDENCE_RECORDS_EXPLANATION_CODES.DISPUTED_EVIDENCE_CANNOT_BE_ACCEPTED);
      return {
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        outcome: 'INCOMPLETE',
        requiredEvidenceCount: input.requiredRequirementCodes.length,
        satisfiedEvidenceCount: 0,
        disputedEvidenceCount,
        unresolvedEvidenceCount: 0,
        integrityFailureCount: 0,
        explanationCodes,
      };
    }

    const satisfiedCodes = new Set<string>();
    let unresolvedEvidenceCount = 0;

    for (const requirementCode of input.requiredRequirementCodes) {
      const satisfyingRecords = input.evidenceRecords.filter((record) =>
        record.requirementLinks.some(
          (link) => link.requirementCode === requirementCode && link.satisfied,
        ),
      );

      if (satisfyingRecords.length === 0) {
        unresolvedEvidenceCount += 1;
        continue;
      }

      const hasAccepted = satisfyingRecords.some(
        (record) => record.status === EvidenceStatus.ACCEPTED,
      );
      const hasVerifiedOnly = satisfyingRecords.some(
        (record) => record.status === EvidenceStatus.VERIFIED,
      );
      const hasPending = satisfyingRecords.some(
        (record) => record.status === EvidenceStatus.RECEIVED,
      );

      if (hasAccepted) {
        satisfiedCodes.add(requirementCode);
      } else if (hasVerifiedOnly || hasPending) {
        unresolvedEvidenceCount += 1;
      }
    }

    const satisfiedEvidenceCount = satisfiedCodes.size;

    if (unresolvedEvidenceCount > 0) {
      return {
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        outcome: 'UNRESOLVED',
        requiredEvidenceCount: input.requiredRequirementCodes.length,
        satisfiedEvidenceCount,
        disputedEvidenceCount: 0,
        unresolvedEvidenceCount,
        integrityFailureCount: 0,
        explanationCodes,
      };
    }

    explanationCodes.push(EVIDENCE_RECORDS_EXPLANATION_CODES.EVIDENCE_ACCEPTANCE_NOT_APPROVAL);

    return {
      masterAdministrativeFileId: input.masterAdministrativeFileId,
      outcome: 'COMPLETE',
      requiredEvidenceCount: input.requiredRequirementCodes.length,
      satisfiedEvidenceCount,
      disputedEvidenceCount: 0,
      unresolvedEvidenceCount: 0,
      integrityFailureCount: 0,
      explanationCodes,
    };
  }
}
