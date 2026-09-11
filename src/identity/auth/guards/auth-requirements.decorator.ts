import { SetMetadata } from '@nestjs/common';
import { type AssuranceLevel } from '@prisma/client';

export const AUTH_REQUIREMENTS_KEY = 'auth_requirements';

export interface AuthRequirementsOptions {
  public?: boolean;
  mfaVerified?: boolean;
  minimumAssuranceLevel?: AssuranceLevel;
  trustedProvider?: string;
  servicePrincipal?: boolean;
}

export const AuthRequirements = (options: AuthRequirementsOptions) =>
  SetMetadata(AUTH_REQUIREMENTS_KEY, options);
