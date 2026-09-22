import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import {
  FORBIDDEN_AI_PROPERTY_ACTIONS,
  PLATFORM_ADMIN_PROPERTY_ROLE_MARKER,
  PROPERTY_REASON_CODES,
} from '../property-registry.constants';

@Injectable()
export class PropertyRegistryBoundaryService {
  assertApplicationCannotMutateTitle(mayMutateTitle: boolean): void {
    if (mayMutateTitle) {
      throw new ForbiddenException(PROPERTY_REASON_CODES.TRANSFER_APPLICATION_CANNOT_MUTATE_TITLE);
    }
  }

  assertTransferDecisionRequired(hasApprovedDecision: boolean): void {
    if (!hasApprovedDecision) {
      throw new ForbiddenException(PROPERTY_REASON_CODES.TRANSFER_DECISION_REQUIRED);
    }
  }

  assertSurveyDoesNotAlterParcel(altersParcelGeometry: boolean): void {
    if (altersParcelGeometry) {
      throw new BadRequestException(PROPERTY_REASON_CODES.SURVEY_CANNOT_ALTER_PARCEL);
    }
  }

  assertPlatformAdminCannotAlterTitle(roleMarker: string | undefined): void {
    if (roleMarker === PLATFORM_ADMIN_PROPERTY_ROLE_MARKER) {
      throw new ForbiddenException(PROPERTY_REASON_CODES.PLATFORM_ADMIN_CANNOT_ALTER_TITLE);
    }
  }

  assertAiCannotPerformConsequentialAction(
    identityType: IdentityType,
    action: (typeof FORBIDDEN_AI_PROPERTY_ACTIONS)[number],
  ): void {
    if (identityType === IdentityType.SERVICE && FORBIDDEN_AI_PROPERTY_ACTIONS.includes(action)) {
      throw new ForbiddenException(`AI assistance cannot perform ${action}`);
    }
  }

  assertCertificateReferencesRegistryVersion(registryVersionNumber: number | undefined): void {
    if (registryVersionNumber == null || registryVersionNumber < 1) {
      throw new BadRequestException(PROPERTY_REASON_CODES.CERTIFICATE_REQUIRES_REGISTRY_VERSION);
    }
  }

  sanitizePublicVerificationPayload(input: {
    parcelReference: string;
    status: string;
    administrativeAddressSummary: string | null;
    internalParcelIdentifier: string | null;
    sealedDataReference: string | null;
  }) {
    return {
      parcelReference: input.parcelReference,
      status: input.status,
      locationSummary: input.administrativeAddressSummary,
      verificationTimestamp: new Date().toISOString(),
    };
  }
}
