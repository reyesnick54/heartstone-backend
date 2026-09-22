import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AdverseEventCausalityStatus, IdentityType } from '@prisma/client';

import {
  FORBIDDEN_AI_HEALTHCARE_ACTIONS,
  HEALTHCARE_REASON_CODES,
  PLATFORM_ADMIN_HEALTHCARE_ROLE_MARKER,
} from '../healthcare.constants';

@Injectable()
export class HealthcareBoundaryService {
  assertPlatformAdminCannotBypassHealthcarePolicy(roleMarker: string | undefined): void {
    if (roleMarker === PLATFORM_ADMIN_HEALTHCARE_ROLE_MARKER) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.PLATFORM_ADMIN_BYPASS_DENIED);
    }
  }

  assertAiCannotEstablishAdverseEventCausality(
    identityType: IdentityType,
    action: (typeof FORBIDDEN_AI_HEALTHCARE_ACTIONS)[number],
  ): void {
    if (identityType === IdentityType.SERVICE && FORBIDDEN_AI_HEALTHCARE_ACTIONS.includes(action)) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.AI_CAUSALITY_DENIED);
    }
  }

  assertReportDoesNotAutoEstablishCausality(input: {
    causalityEstablished: boolean;
    causalityAssessmentStatus: AdverseEventCausalityStatus;
  }): void {
    if (input.causalityEstablished) {
      throw new BadRequestException(
        'Adverse event reports must not be filed with causality already established',
      );
    }
    if (input.causalityAssessmentStatus !== AdverseEventCausalityStatus.NOT_ASSESSED) {
      throw new BadRequestException(
        'Adverse event reports must start with causality not assessed at filing time',
      );
    }
  }

  assertAssessorCannotBeAi(assessorIsAi: boolean): void {
    if (assessorIsAi) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.AI_CAUSALITY_DENIED);
    }
  }

  assertSafetyRecordCannotBeSilentlyDeleted(operation: 'delete' | 'update'): void {
    if (operation === 'delete') {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.SAFETY_SILENT_DELETE_DENIED);
    }
  }

  assertIntegrationFailureNotFabricatedSuccess(succeeded: boolean, status: string): void {
    if (!succeeded && status === 'SUCCEEDED') {
      throw new BadRequestException(HEALTHCARE_REASON_CODES.INTEGRATION_FAILURE_NOT_SUCCESS);
    }
  }

  assertDiscrepancyNotSilentOverwrite(authoritativeOverwrite: boolean): void {
    if (authoritativeOverwrite) {
      throw new BadRequestException(HEALTHCARE_REASON_CODES.DISCREPANCY_NOT_SILENT_OVERWRITE);
    }
  }

  assertNonConsentBasisNotMislabeledAsConsent(input: {
    accessBasisKind: string;
    representsPatientConsent: boolean;
  }): void {
    if (input.accessBasisKind !== 'PATIENT_CONSENT' && input.representsPatientConsent) {
      throw new BadRequestException(
        'Non-consent access basis must not be represented as patient consent',
      );
    }
  }
}
