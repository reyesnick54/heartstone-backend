import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { AssuranceLevel } from '@prisma/client';

import { API_ERROR_CODES, codedErrorBody } from '../../../common/errors/api-error-codes';
import type { SessionContextDto } from '../dto/session-context.dto';
import type { MappedOidcClaims } from '../oidc/types/mapped-oidc-claims';

export interface MfaRequirement {
  required?: boolean;
  minimumAssuranceLevel?: AssuranceLevel;
}

export const MFA_REQUIRED_MESSAGE = 'Multi-factor authentication is required';
export const ASSURANCE_INSUFFICIENT_MESSAGE = 'Authentication assurance level is insufficient';

function mfaRequired(): UnauthorizedException {
  return new UnauthorizedException(
    codedErrorBody(HttpStatus.UNAUTHORIZED, MFA_REQUIRED_MESSAGE, API_ERROR_CODES.MFA_REQUIRED),
  );
}

function assuranceInsufficient(): UnauthorizedException {
  return new UnauthorizedException(
    codedErrorBody(
      HttpStatus.UNAUTHORIZED,
      ASSURANCE_INSUFFICIENT_MESSAGE,
      API_ERROR_CODES.ASSURANCE_INSUFFICIENT,
    ),
  );
}

@Injectable()
export class MfaAssuranceService {
  evaluateRequirement(requirement: MfaRequirement, session: SessionContextDto): void {
    if (requirement.required && !session.mfaSatisfied) {
      throw mfaRequired();
    }

    if (
      requirement.minimumAssuranceLevel &&
      !this.meetsMinimumAssurance(session.assuranceLevel, requirement.minimumAssuranceLevel)
    ) {
      throw assuranceInsufficient();
    }
  }

  evaluateClaims(requirement: MfaRequirement, claims: MappedOidcClaims): void {
    if (!requirement.required) {
      return;
    }

    if (!claims.mfaSatisfied) {
      throw mfaRequired();
    }

    if (
      requirement.minimumAssuranceLevel &&
      !this.meetsMinimumAssurance(claims.assuranceLevel, requirement.minimumAssuranceLevel)
    ) {
      throw assuranceInsufficient();
    }
  }

  private meetsMinimumAssurance(actual: AssuranceLevel, required: AssuranceLevel): boolean {
    const order: AssuranceLevel[] = [
      AssuranceLevel.NONE,
      AssuranceLevel.LOW,
      AssuranceLevel.MEDIUM,
      AssuranceLevel.HIGH,
    ];

    return order.indexOf(actual) >= order.indexOf(required);
  }
}
