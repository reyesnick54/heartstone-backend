import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  DigitalAssetsActorPersona,
  DigitalAssetsExternalDependencyStatus,
} from '@prisma/client';

import {
  DIGITAL_ASSETS_REASON_CODES,
  FORBIDDEN_AI_DIGITAL_ASSETS_ACTIONS,
} from '../digital-assets.constants';
import { FORBIDDEN_CLIENT_AUTHORIZATION_FIELDS } from '../digital-assets-schema.constants';

@Injectable()
export class DigitalAssetsBoundaryService {
  rejectClientAuthorizationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_AUTHORIZATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${DIGITAL_ASSETS_REASON_CODES.APPLICANT_CANNOT_SELF_AUTHORIZE}: ${field}`,
        );
      }
    }
  }

  assertApplicantCannotSelfAuthorize(actorPersona: DigitalAssetsActorPersona): void {
    if (actorPersona === DigitalAssetsActorPersona.APPLICANT) {
      throw new ForbiddenException(DIGITAL_ASSETS_REASON_CODES.APPLICANT_CANNOT_SELF_AUTHORIZE);
    }
  }

  assertAiCannotApproveAuthorization(
    actorPersona: DigitalAssetsActorPersona,
    action: string,
  ): void {
    if (
      actorPersona === DigitalAssetsActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_DIGITAL_ASSETS_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`AI assistance cannot perform digital-assets action: ${action}`);
    }
  }

  assertPaymentDoesNotApproveAuthorization(actorPersona: DigitalAssetsActorPersona): void {
    if (actorPersona === DigitalAssetsActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException('Payment receipt does not approve or issue digital-asset authorization');
    }
  }

  assertBlockchainVerificationDoesNotApprove(actorPersona: DigitalAssetsActorPersona): void {
    if (actorPersona === DigitalAssetsActorPersona.BLOCKCHAIN_VERIFICATION_SERVICE) {
      throw new ForbiddenException(
        'Blockchain or timestamp verification does not approve or issue government authorization',
      );
    }
  }

  assertTechnicalReviewIsNotAutonomousApproval(isOfficialApproval: boolean): void {
    if (isOfficialApproval) {
      throw new BadRequestException(
        'Technical review records document evidence administration only and cannot mark official approval',
      );
    }
  }

  assertExternalDependenciesResolved(
    dependencies: {
      blocksFinalDecision: boolean;
      status: DigitalAssetsExternalDependencyStatus;
    }[],
  ): void {
    const blocking = dependencies.filter(
      (dependency) =>
        dependency.blocksFinalDecision &&
        dependency.status !== DigitalAssetsExternalDependencyStatus.RESOLVED,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(DIGITAL_ASSETS_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS);
    }
  }

  assertAuthorizationRequiresGovernedInstrument(input: {
    governmentDecisionId?: string | null;
    officialInstrumentId?: string | null;
  }): void {
    if (!input.governmentDecisionId || !input.officialInstrumentId) {
      throw new BadRequestException(DIGITAL_ASSETS_REASON_CODES.AUTHORIZATION_AUTHORITY_NOT_CONFIGURED);
    }
  }

  rejectApplicantForgedExternalResponse(
    actorPersona: DigitalAssetsActorPersona,
    isAuthenticated: boolean,
  ): void {
    if (actorPersona === DigitalAssetsActorPersona.APPLICANT && isAuthenticated) {
      throw new ForbiddenException(DIGITAL_ASSETS_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS);
    }
  }
}
