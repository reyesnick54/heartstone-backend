import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssuranceLevel } from '@prisma/client';

import { IDENTITY_CONFIG, type IdentityConfig } from '../../../config/config.constants';
import { SecurityAuditService } from '../../audit/security-audit.service';
import type { SessionContextDto } from '../dto/session-context.dto';
import { MfaAssuranceService, type MfaRequirement } from '../mfa/mfa-assurance.service';

export interface StepUpRequirement extends MfaRequirement {
  /** When true, authentication must be recent per configured max age. */
  requireRecentAuthentication?: boolean;
  maxAuthenticationAgeSeconds?: number;
}

@Injectable()
export class StepUpAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly mfaAssurance: MfaAssuranceService,
    private readonly audit: SecurityAuditService,
  ) {}

  private get identityConfig(): IdentityConfig {
    return this.configService.getOrThrow<IdentityConfig>(IDENTITY_CONFIG);
  }

  async enforce(requirement: StepUpRequirement, session: SessionContextDto): Promise<void> {
    this.mfaAssurance.evaluateRequirement(requirement, session);

    const requireRecent =
      requirement.requireRecentAuthentication === true ||
      (requirement.minimumAssuranceLevel !== undefined &&
        requirement.minimumAssuranceLevel !== AssuranceLevel.NONE &&
        requirement.minimumAssuranceLevel !== AssuranceLevel.LOW);

    if (!requireRecent) {
      return;
    }

    const maxAgeSeconds =
      requirement.maxAuthenticationAgeSeconds ??
      this.identityConfig.stepUpMaxAuthenticationAgeSeconds;

    const authenticatedAt = session.authenticatedAt ?? new Date(0);
    const ageMs = Date.now() - authenticatedAt.getTime();

    if (ageMs > maxAgeSeconds * 1000) {
      await this.audit.record({
        eventType: 'STEP_UP_REQUIRED',
        sessionId: session.sessionId,
        identityId: session.identityId,
        userAccountId: session.userAccountId ?? undefined,
        metadata: {
          reason: 'authentication_too_old',
          maxAuthenticationAgeSeconds: maxAgeSeconds,
          assuranceLevel: session.assuranceLevel,
        },
      });
      throw new UnauthorizedException('Recent stronger authentication is required');
    }
  }
}
