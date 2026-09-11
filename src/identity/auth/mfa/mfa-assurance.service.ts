import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AssuranceLevel } from '@prisma/client';

import type { SessionContextDto } from '../dto/session-context.dto';
import type { MappedOidcClaims } from '../oidc/types/mapped-oidc-claims';

export interface MfaRequirement {
  required: boolean;
  minimumAssuranceLevel?: AssuranceLevel;
}

@Injectable()
export class MfaAssuranceService {
  evaluateRequirement(requirement: MfaRequirement, session: SessionContextDto): void {
    if (requirement.required && !session.mfaSatisfied) {
      throw new UnauthorizedException('Multi-factor authentication is required');
    }

    if (
      requirement.minimumAssuranceLevel &&
      !this.meetsMinimumAssurance(session.assuranceLevel, requirement.minimumAssuranceLevel)
    ) {
      throw new UnauthorizedException('Authentication assurance level is insufficient');
    }
  }

  evaluateClaims(requirement: MfaRequirement, claims: MappedOidcClaims): void {
    if (!requirement.required) {
      return;
    }

    if (!claims.mfaSatisfied) {
      throw new UnauthorizedException('Multi-factor authentication is required');
    }

    if (
      requirement.minimumAssuranceLevel &&
      !this.meetsMinimumAssurance(claims.assuranceLevel, requirement.minimumAssuranceLevel)
    ) {
      throw new UnauthorizedException('Authentication assurance level is insufficient');
    }
  }

  extractAssuranceFromClaims(claims: MappedOidcClaims): {
    assuranceLevel: AssuranceLevel;
    mfaSatisfied: boolean;
    authenticationMethod: string;
    authenticatedAt: Date;
  } {
    return {
      assuranceLevel: claims.assuranceLevel,
      mfaSatisfied: claims.mfaSatisfied,
      authenticationMethod: claims.authenticationMethod,
      authenticatedAt: claims.authenticatedAt,
    };
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
