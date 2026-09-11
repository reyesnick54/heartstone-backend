import { Injectable } from '@nestjs/common';
import { AssuranceLevel, AuthenticationMethodType } from '@prisma/client';

import type { MappedOidcClaims } from './types/mapped-oidc-claims';

const MFA_AMR_VALUES = new Set(['mfa', 'otp', 'hwk', 'sms', 'pin']);

export interface RawOidcJwtClaims {
  iss: string;
  sub: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  amr?: string[];
  acr?: string;
  auth_time?: number;
  roles?: string[];
  groups?: string[];
  [key: string]: unknown;
}

@Injectable()
export class ClaimMapperService {
  mapClaims(
    providerCode: string,
    expectedAudience: string,
    payload: RawOidcJwtClaims,
  ): MappedOidcClaims {
    const amr = this.normalizeAmr(payload.amr);
    const mfaSatisfied = this.evaluateMfaSatisfied(amr, payload.acr);
    const assuranceLevel = this.resolveAssuranceLevel(amr, payload.acr, mfaSatisfied);

    const externalContext: Record<string, unknown> = {};
    if (payload.roles !== undefined) {
      externalContext.roles = payload.roles;
    }
    if (payload.groups !== undefined) {
      externalContext.groups = payload.groups;
    }
    if (payload.acr !== undefined) {
      externalContext.acr = payload.acr;
    }

    return {
      issuer: payload.iss,
      subject: payload.sub,
      audience: payload.aud ?? expectedAudience,
      providerCode,
      authenticationMethod: AuthenticationMethodType.OIDC,
      authenticatedAt: this.resolveAuthenticationTime(payload),
      assuranceLevel,
      mfaSatisfied,
      amr,
      acr: payload.acr,
      externalContext,
    };
  }

  /**
   * External IdP role/authority claims are identity context only.
   * They must never be interpreted as HeartStone governmental authority.
   */
  extractExternalContextOnly(claims: MappedOidcClaims): Record<string, unknown> {
    return { ...claims.externalContext };
  }

  private normalizeAmr(amr: unknown): string[] {
    if (!Array.isArray(amr)) {
      return [];
    }
    return amr.filter((value): value is string => typeof value === 'string');
  }

  private evaluateMfaSatisfied(amr: string[], acr?: string): boolean {
    if (amr.some((method) => MFA_AMR_VALUES.has(method.toLowerCase()))) {
      return true;
    }

    if (typeof acr === 'string') {
      const normalized = acr.toLowerCase();
      if (normalized.includes('mfa') || normalized.includes('multi')) {
        return true;
      }
    }

    return false;
  }

  private resolveAssuranceLevel(
    amr: string[],
    acr?: string,
    mfaSatisfied?: boolean,
  ): AssuranceLevel {
    if (amr.some((method) => method.toLowerCase() === 'hwk')) {
      return AssuranceLevel.HIGH;
    }

    if (mfaSatisfied) {
      return AssuranceLevel.HIGH;
    }

    if (amr.length > 0 || (typeof acr === 'string' && acr.length > 0)) {
      return AssuranceLevel.MEDIUM;
    }

    return AssuranceLevel.LOW;
  }

  private resolveAuthenticationTime(payload: RawOidcJwtClaims): Date {
    if (typeof payload.auth_time === 'number') {
      return new Date(payload.auth_time * 1000);
    }

    if (typeof payload.iat === 'number') {
      return new Date(payload.iat * 1000);
    }

    return new Date();
  }
}
