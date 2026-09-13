import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  InspectionFindingSeverity,
  InspectionFindingStatus,
  ProfessionalSignatureSource,
} from '@prisma/client';

import {
  AI_CANNOT_CONFIRM_VIOLATION_MESSAGE,
  COMPLETION_DOES_NOT_SUSPEND_INSTRUMENT_MESSAGE,
  COMPLETION_IS_NOT_COMPLIANCE_CERTIFICATION_MESSAGE,
  FINDING_IS_NOT_SANCTION_MESSAGE,
  FINDING_REQUIRES_REQUIREMENT_SOURCE_MESSAGE,
  OBSERVATION_IS_NOT_VIOLATION_MESSAGE,
  SCOPE_AMENDMENT_REQUIRES_APPROVAL_MESSAGE,
} from '../inspection-compliance.constants';

export class InspectionComplianceBoundaryService {
  assertObservationIsNotViolation(observationText: string): void {
    const normalized = observationText.toLowerCase();
    const violationPhrases = [
      'in violation',
      'non-compliance',
      'noncompliance',
      'violates',
      'sanction',
      'enforcement decision',
    ];

    if (violationPhrases.some((phrase) => normalized.includes(phrase))) {
      throw new BadRequestException(OBSERVATION_IS_NOT_VIOLATION_MESSAGE);
    }
  }

  assertFindingIsNotSanction(severity: InspectionFindingSeverity): {
    constitutesSanction: boolean;
  } {
    return { constitutesSanction: false };
  }

  assertSeverityDoesNotImplySanction(severity: InspectionFindingSeverity): {
    constitutesSanction: false;
    severity: InspectionFindingSeverity;
  } {
    this.assertFindingIsNotSanction(severity);
    return { constitutesSanction: false, severity };
  }

  assertAiCannotConfirmViolation(signatureSource: ProfessionalSignatureSource): void {
    if (signatureSource === ProfessionalSignatureSource.AI_ASSISTANCE) {
      throw new ForbiddenException(AI_CANNOT_CONFIRM_VIOLATION_MESSAGE);
    }
  }

  assertFindingReferencesRequirement(requirementLinkCount: number): void {
    if (requirementLinkCount === 0) {
      throw new BadRequestException(FINDING_REQUIRES_REQUIREMENT_SOURCE_MESSAGE);
    }
  }

  assertFindingWithoutEvidenceCanBeUnresolved(evidenceCount: number): boolean {
    return evidenceCount === 0;
  }

  assertScopeExpansionRequiresAmendment(input: {
    originalScope: string;
    requestedScope: string;
    amendmentApproved: boolean;
  }): void {
    if (input.requestedScope.trim() !== input.originalScope.trim() && !input.amendmentApproved) {
      throw new BadRequestException(SCOPE_AMENDMENT_REQUIRES_APPROVAL_MESSAGE);
    }
  }

  assertCompletionIsNotComplianceCertification(constitutesComplianceCertification: boolean): void {
    if (constitutesComplianceCertification) {
      throw new BadRequestException(COMPLETION_IS_NOT_COMPLIANCE_CERTIFICATION_MESSAGE);
    }
  }

  assertCompletionDoesNotSuspendInstrument(): void {
    throw new BadRequestException(COMPLETION_DOES_NOT_SUSPEND_INSTRUMENT_MESSAGE);
  }

  isConsequentialFindingStatus(status: InspectionFindingStatus): boolean {
    return (
      status === InspectionFindingStatus.CONFIRMED ||
      status === InspectionFindingStatus.CORRECTIVE_ACTION_REQUIRED ||
      status === InspectionFindingStatus.REFERRED
    );
  }

  assertResponseDoesNotOverwriteOriginal(): { preservesOriginal: true } {
    return { preservesOriginal: true };
  }
}
