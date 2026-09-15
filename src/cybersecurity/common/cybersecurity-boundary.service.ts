import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BreakGlassAccessStatus,
  BuildProvenanceStatus,
  CredentialStatus,
  ReleaseAttestationStatus,
  SecurityEnvironment,
  SecurityExceptionStatus,
  SecurityFindingSeverity,
} from '@prisma/client';

import {
  AUTHORIZED_SECURITY_TEST_ENVIRONMENTS,
  CONFLATION_PAIRS,
  CYBERSECURITY_REASON_CODES,
  FORBIDDEN_CLIENT_BREAK_GLASS_FIELDS,
  FORBIDDEN_CLIENT_CRYPTOGRAPHIC_ASSET_FIELDS,
  FORBIDDEN_CLIENT_RELEASE_ATTESTATION_FIELDS,
  FORBIDDEN_CLIENT_SECURITY_EXCEPTION_FIELDS,
  FORBIDDEN_SECRET_PERSISTENCE_FIELDS,
  PHASE_13B_BOUNDARY_DISCLAIMERS,
} from '../cybersecurity.constants';

export interface CredentialValidationInput {
  status: CredentialStatus;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  identitySuspended?: boolean;
}

export interface BreakGlassAccessState {
  status: BreakGlassAccessStatus;
  expiresAt: Date;
  enhancedLoggingReference?: string | null;
  createsInstitutionalAuthority: boolean;
}

export interface CryptographicAssetClaims {
  claimsPostQuantumSecurity: boolean;
  postQuantumValidated: boolean;
  historicalVerificationPreserved: boolean;
  algorithmVersion: string;
}

export interface ReleaseArtifactInput {
  isSigned: boolean;
  status: ReleaseAttestationStatus;
  buildProvenanceStatus: BuildProvenanceStatus;
  artifactDigest: string;
  sourceCommitSha: string;
}

export interface SecurityExceptionState {
  status: SecurityExceptionStatus;
  expiresAt: Date;
  isPermanent: boolean;
  severity: SecurityFindingSeverity;
}

export interface ProductionReadinessInput {
  criticalUndispositionedVulnerabilities: number;
  unsignedReleaseArtifacts: number;
  unverifiableProvenanceRecords: number;
  expiredExceptions: number;
  openCriticalFindings: number;
}

@Injectable()
export class CybersecurityBoundaryService {
  rejectClientProtectedSecurityExceptionFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_SECURITY_EXCEPTION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a security exception`);
      }
    }
  }

  rejectClientProtectedReleaseAttestationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_RELEASE_ATTESTATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a release attestation`);
      }
    }
  }

  rejectClientProtectedCryptographicAssetFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_CRYPTOGRAPHIC_ASSET_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a cryptographic asset`);
      }
    }
  }

  rejectClientProtectedBreakGlassFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_BREAK_GLASS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a break-glass event`);
      }
    }
  }

  assertNoConflation(left: string, right: string): void {
    for (const [a, b] of CONFLATION_PAIRS) {
      if ((left === a && right === b) || (left === b && right === a)) {
        throw new BadRequestException({
          code: CYBERSECURITY_REASON_CODES.CONFLATION_FORBIDDEN,
          message: `${left} must not be conflated with ${right}`,
        });
      }
    }
  }

  assertSysadminCannotApproveApplication(actorRole: string, action: string): void {
    if (
      actorRole.toLowerCase().includes('sysadmin') &&
      action.toLowerCase().includes('approve_application')
    ) {
      throw new ForbiddenException({
        code: CYBERSECURITY_REASON_CODES.SYSADMIN_CANNOT_APPROVE_APPLICATION,
        message: PHASE_13B_BOUNDARY_DISCLAIMERS.TECHNICAL_ADMIN_NOT_DECISION_MAKER,
      });
    }
  }

  assertDatabaseAdminCannotCreateAuthority(actorRole: string, action: string): void {
    if (
      actorRole.toLowerCase().includes('database_admin') &&
      action.toLowerCase().includes('create_authority')
    ) {
      throw new ForbiddenException({
        code: CYBERSECURITY_REASON_CODES.DB_ADMIN_CANNOT_CREATE_AUTHORITY,
        message: 'Database administration cannot create institutional authority',
      });
    }
  }

  assertServiceTokenCannotImpersonateOfficeholder(
    identityType: string,
    targetAuthorityType: string,
  ): void {
    if (identityType === 'SERVICE' && targetAuthorityType.toLowerCase().includes('officeholder')) {
      throw new ForbiddenException({
        code: CYBERSECURITY_REASON_CODES.SERVICE_TOKEN_OFFICEHOLDER_IMPERSONATION,
        message: PHASE_13B_BOUNDARY_DISCLAIMERS.SERVICE_IDENTITY_NOT_OFFICEHOLDER,
      });
    }
  }

  assertCredentialUsable(input: CredentialValidationInput, now = new Date()): void {
    if (input.status === CredentialStatus.REVOKED || input.revokedAt) {
      throw new UnauthorizedException({
        code: CYBERSECURITY_REASON_CODES.CREDENTIAL_REVOKED,
        message: 'Revoked credentials are rejected',
      });
    }

    if (input.identitySuspended) {
      throw new UnauthorizedException({
        code: CYBERSECURITY_REASON_CODES.SUSPENDED_AGENT_CREDENTIAL,
        message: 'Suspended agent credentials are revoked for use',
      });
    }

    if (input.expiresAt && input.expiresAt <= now) {
      throw new UnauthorizedException({
        code: CYBERSECURITY_REASON_CODES.CREDENTIAL_EXPIRED,
        message: 'Expired credentials are rejected',
      });
    }
  }

  assertBreakGlassActive(state: BreakGlassAccessState, now = new Date()): void {
    if (state.status === BreakGlassAccessStatus.EXPIRED || state.expiresAt <= now) {
      throw new ForbiddenException({
        code: CYBERSECURITY_REASON_CODES.BREAK_GLASS_EXPIRED,
        message: 'Break-glass access has expired',
      });
    }

    if (state.status === BreakGlassAccessStatus.ACTIVE && !state.enhancedLoggingReference?.trim()) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.BREAK_GLASS_NOT_LOGGED,
        message: 'Break-glass access requires enhanced logging',
      });
    }

    if (state.createsInstitutionalAuthority) {
      throw new BadRequestException({
        message: PHASE_13B_BOUNDARY_DISCLAIMERS.BREAK_GLASS_NOT_AUTHORITY,
      });
    }
  }

  assertSecretNotPersisted(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_SECRET_PERSISTENCE_FIELDS) {
      const value = payload[field];
      if (typeof value === 'string' && value.length > 0) {
        throw new BadRequestException({
          code: CYBERSECURITY_REASON_CODES.SECRET_IN_DATABASE,
          message: 'Critical secrets cannot be persisted in the database',
        });
      }
    }
  }

  assertSecretManagerReferenceOnly(reference: string): void {
    const normalized = reference.trim().toLowerCase();
    if (
      normalized.startsWith('sk-') ||
      normalized.startsWith('apikey_') ||
      normalized.includes('password=') ||
      normalized.includes('secret=')
    ) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.SECRET_IN_SOURCE_CONTROL,
        message: 'Only environment/secret-manager references are permitted',
      });
    }
  }

  blockSecretResponseLeakage(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          !FORBIDDEN_SECRET_PERSISTENCE_FIELDS.includes(
            key as (typeof FORBIDDEN_SECRET_PERSISTENCE_FIELDS)[number],
          ),
      ),
    );
  }

  assertReleaseArtifactVerifiable(input: ReleaseArtifactInput): void {
    if (!input.isSigned) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.UNSIGNED_RELEASE,
        message: 'Unsigned release artifacts are rejected',
      });
    }

    if (input.buildProvenanceStatus === BuildProvenanceStatus.UNVERIFIABLE) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.UNVERIFIABLE_PROVENANCE,
        message: 'Unverifiable build provenance is rejected',
      });
    }

    if (!input.artifactDigest.trim() || !input.sourceCommitSha.trim()) {
      throw new BadRequestException('Release must trace to source commit and artifact digest');
    }
  }

  assertSecurityExceptionEffective(state: SecurityExceptionState, now = new Date()): void {
    if (state.isPermanent) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.PERMANENT_EXCEPTION_FORBIDDEN,
        message: 'No permanent exception by default',
      });
    }

    if (state.status === SecurityExceptionStatus.EXPIRED || state.expiresAt <= now) {
      throw new ForbiddenException({
        code: CYBERSECURITY_REASON_CODES.EXCEPTION_EXPIRED,
        message: 'Security exception expiration is enforced',
      });
    }
  }

  assertSeverityDoesNotAcceptRisk(severity: SecurityFindingSeverity, riskAccepted: boolean): void {
    if (riskAccepted && severity === SecurityFindingSeverity.CRITICAL) {
      throw new BadRequestException({
        message: PHASE_13B_BOUNDARY_DISCLAIMERS.SEVERITY_NOT_RISK_ACCEPTANCE,
      });
    }
  }

  assertPostQuantumClaimsValid(claims: CryptographicAssetClaims): void {
    if (claims.claimsPostQuantumSecurity && !claims.postQuantumValidated) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.PQC_OVERSTATED,
        message: PHASE_13B_BOUNDARY_DISCLAIMERS.PQC_CAPABILITY_NOT_MIGRATION,
      });
    }
  }

  assertHistoricalVerificationPreserved(preserved: boolean): void {
    if (!preserved) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.HISTORICAL_VERIFICATION_LOST,
        message: 'Historical signature verification must be preserved after crypto rotation',
      });
    }
  }

  assertAlgorithmVersionPreserved(previousVersion: string, nextVersion: string): void {
    if (!previousVersion.trim() || !nextVersion.trim()) {
      throw new BadRequestException('Cryptographic algorithm version must be preserved');
    }
  }

  assertCertificateNotExpired(expiresAt: Date, now = new Date()): void {
    if (expiresAt <= now) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.CERTIFICATE_EXPIRED,
        message: 'Certificate expiration must be visible and enforced',
      });
    }
  }

  assertSecurityTestEnvironmentAuthorized(environment: SecurityEnvironment): void {
    if (
      !AUTHORIZED_SECURITY_TEST_ENVIRONMENTS.includes(
        environment as (typeof AUTHORIZED_SECURITY_TEST_ENVIRONMENTS)[number],
      )
    ) {
      throw new ForbiddenException({
        code: CYBERSECURITY_REASON_CODES.PRODUCTION_TEST_FORBIDDEN,
        message: 'Security testing must occur only against authorized test environments',
      });
    }
  }

  assertNoSharedAdministratorAccount(
    environment: SecurityEnvironment,
    isSharedAdministratorAccount: boolean,
  ): void {
    if (environment === SecurityEnvironment.PRODUCTION && isSharedAdministratorAccount) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.SHARED_ADMIN_ACCOUNT,
        message: 'No shared administrator accounts for consequential environments',
      });
    }
  }

  assertAnonymousServiceIdentityBlocked(
    isAnonymousOrShared: boolean,
    isConsequentialEnvironment: boolean,
  ): void {
    if (isAnonymousOrShared && isConsequentialEnvironment) {
      throw new BadRequestException('No anonymous/shared consequential service identities');
    }
  }

  assertDependencyChangeRequiresControlledRelease(
    previousVersion: string,
    nextVersion: string,
    hasControlledReleaseReference: boolean,
  ): void {
    if (previousVersion !== nextVersion && !hasControlledReleaseReference) {
      throw new BadRequestException({
        code: CYBERSECURITY_REASON_CODES.UNCONTROLLED_DEPENDENCY_CHANGE,
        message:
          'Dependency changes require compatibility/test/change-control process before production release',
      });
    }
  }

  evaluateProductionReadiness(input: ProductionReadinessInput): {
    status: 'BLOCKED' | 'CONDITIONALLY_READY' | 'READY';
    blockers: string[];
  } {
    const blockers: string[] = [];

    if (input.criticalUndispositionedVulnerabilities > 0) {
      blockers.push(CYBERSECURITY_REASON_CODES.CRITICAL_VULNERABILITY_UNDISPOSITIONED);
    }
    if (input.unsignedReleaseArtifacts > 0) {
      blockers.push(CYBERSECURITY_REASON_CODES.UNSIGNED_RELEASE);
    }
    if (input.unverifiableProvenanceRecords > 0) {
      blockers.push(CYBERSECURITY_REASON_CODES.UNVERIFIABLE_PROVENANCE);
    }
    if (input.expiredExceptions > 0) {
      blockers.push(CYBERSECURITY_REASON_CODES.EXCEPTION_EXPIRED);
    }
    if (input.openCriticalFindings > 0) {
      blockers.push('OPEN_CRITICAL_FINDINGS');
    }

    if (blockers.length > 0) {
      return { status: 'BLOCKED', blockers };
    }

    return { status: 'READY', blockers: [] };
  }

  assertAccreditationNotOperationalActivation(
    accreditationGranted: boolean,
    operationalActivationApproved: boolean,
  ): void {
    if (accreditationGranted && !operationalActivationApproved) {
      this.assertNoConflation('SECURITY_ACCREDITATION', 'OPERATIONAL_ACTIVATION');
    }
  }
}
