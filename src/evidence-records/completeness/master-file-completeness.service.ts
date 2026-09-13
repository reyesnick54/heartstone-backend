import { Injectable } from '@nestjs/common';
import { EvidenceRecordStatus } from '@prisma/client';

import { EVIDENCE_RECORDS_EXPLANATION_CODES } from '../evidence-records.constants';
import { INTEGRITY_FAILURE_EVENT_TYPES } from '../evidence-records-schema.constants';
import {
  type MasterFileCompletenessAssessment,
  type MasterFileCompletenessInput,
} from './master-file-completeness.types';

const ACCEPTED_EVIDENCE_STATUSES: EvidenceRecordStatus[] = [
  EvidenceRecordStatus.ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE,
  EvidenceRecordStatus.ACCEPTED_FOR_LIMITED_RELIANCE,
];

const VERIFIED_EVIDENCE_STATUSES: EvidenceRecordStatus[] = [
  EvidenceRecordStatus.VERIFIED,
  EvidenceRecordStatus.PARTIALLY_VERIFIED,
];

@Injectable()
export class MasterFileCompletenessService {
  assess(input: MasterFileCompletenessInput): MasterFileCompletenessAssessment {
    const explanationCodes: string[] = [];
    const integrityFailureCount = input.integrityEvents.filter((event) =>
      INTEGRITY_FAILURE_EVENT_TYPES.includes(
        event.eventType as (typeof INTEGRITY_FAILURE_EVENT_TYPES)[number],
      ),
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
      (record) => record.status === EvidenceRecordStatus.DISPUTED,
    ).length;

    if (disputedEvidenceCount > 0) {
      explanationCodes.push(
        EVIDENCE_RECORDS_EXPLANATION_CODES.DISPUTED_EVIDENCE_CANNOT_BE_ACCEPTED,
      );
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

      const hasAccepted = satisfyingRecords.some((record) =>
        ACCEPTED_EVIDENCE_STATUSES.includes(record.status as EvidenceRecordStatus),
      );
      const hasVerifiedOnly = satisfyingRecords.some((record) =>
        VERIFIED_EVIDENCE_STATUSES.includes(record.status as EvidenceRecordStatus),
      );
      const hasPending = satisfyingRecords.some(
        (record) => record.status === EvidenceRecordStatus.RECEIVED,
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
