import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { AcceptanceLevel, IdentityType } from '@prisma/client';

import { AI_ACTOR_IDENTITY_PREFIX } from '../../evidence/evidence.constants';
import {
  FORBIDDEN_ACCEPTANCE_BASIS_TYPES,
  FORBIDDEN_CLIENT_ACCEPTANCE_FIELDS,
  INSTITUTIONAL_ACCEPTANCE_LEVELS,
  TECHNICAL_ACCEPTANCE_LEVELS,
} from '../production-readiness.constants';

@Injectable()
export class ProductionReadinessBoundaryService {
  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_ACCEPTANCE_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(
          `Client may not set protected acceptance or activation field: ${field}`,
        );
      }
    }
  }

  assertAiCannotAcceptDossier(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot accept institutional acceptance dossiers');
    }
  }

  assertAiCannotAcceptResidualRisk(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot accept residual risks');
    }
  }

  assertAiCannotActivateProduction(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot activate production');
    }
  }

  assertHumanOfficeholderRequired(identityType: IdentityType): void {
    if (identityType === IdentityType.SERVICE) {
      throw new ForbiddenException(
        'Service identities cannot perform institutional acceptance or production activation',
      );
    }
  }

  assertDeveloperCannotInstitutionallyAcceptOwnDelivery(
    actorIdentityId: string,
    technicalImplementerIdentityId?: string | null,
  ): void {
    if (technicalImplementerIdentityId && actorIdentityId === technicalImplementerIdentityId) {
      throw new ForbiddenException(
        'Technical implementer cannot institutionally accept their own delivery',
      );
    }
  }

  assertForbiddenAcceptanceBasis(basisType?: string): void {
    if (!basisType) {
      return;
    }

    if (
      (FORBIDDEN_ACCEPTANCE_BASIS_TYPES as readonly string[]).includes(basisType)
    ) {
      throw new BadRequestException(
        `${basisType} cannot constitute institutional acceptance or production activation`,
      );
    }
  }

  assertTechnicalLevelDoesNotImplyInstitutional(level: AcceptanceLevel): void {
    if ((TECHNICAL_ACCEPTANCE_LEVELS as readonly string[]).includes(level)) {
      throw new BadRequestException(
        `Acceptance level ${level} is technical and does not imply institutional acceptance`,
      );
    }
  }

  assertInstitutionalAcceptanceDoesNotEqualActivation(level: AcceptanceLevel): void {
    if (level === AcceptanceLevel.INSTITUTIONAL) {
      throw new BadRequestException(
        'Institutional acceptance does not equal production activation; a separate activation decision is required',
      );
    }
  }

  assertInstitutionalLevelForFinalAcceptance(level: AcceptanceLevel): void {
    if (!(INSTITUTIONAL_ACCEPTANCE_LEVELS as readonly string[]).includes(level)) {
      throw new BadRequestException(
        `Final institutional acceptance requires level INSTITUTIONAL or OPERATIONAL_ACTIVATION, not ${level}`,
      );
    }
  }

  assertNotificationDoesNotCreateActivation(): void {
    // Documented invariant: communications are recorded separately and never mutate activation state.
  }
}
