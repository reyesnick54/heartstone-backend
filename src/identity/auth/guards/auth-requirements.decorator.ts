import { SetMetadata } from '@nestjs/common';
import { type AssuranceLevel } from '@prisma/client';

export const AUTH_REQUIREMENTS_KEY = 'auth_requirements';

export interface AuthRequirementsOptions {
  mfaVerified?: boolean;
  minimumAssuranceLevel?: AssuranceLevel;
  trustedProvider?: string;
  servicePrincipal?: boolean;
  requireRecentAuthentication?: boolean;
  maxAuthenticationAgeSeconds?: number;
}

export const AuthRequirements = (options: AuthRequirementsOptions) =>
  SetMetadata(AUTH_REQUIREMENTS_KEY, options);
