import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  BreakGlassAccessStatus,
  BuildProvenanceStatus,
  CredentialStatus,
  ReleaseAttestationStatus,
  SecurityEnvironment,
  SecurityExceptionStatus,
  SecurityFindingSeverity,
} from '@prisma/client';

import { CybersecurityBoundaryService } from './common/cybersecurity-boundary.service';
import { CYBERSECURITY_REASON_CODES } from './cybersecurity.constants';

describe('Phase 13B must-fail gates', () => {
  let boundary: CybersecurityBoundaryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CybersecurityBoundaryService],
    }).compile();
    boundary = module.get(CybersecurityBoundaryService);
  });

  it('blocks sysadmin from approving applications', () => {
    expect(() => {
      boundary.assertSysadminCannotApproveApplication('sysadmin', 'approve_application');
    }).toThrow(ForbiddenException);
  });

  it('blocks database admin from creating authority', () => {
    expect(() => {
      boundary.assertDatabaseAdminCannotCreateAuthority('database_admin', 'create_authority');
    }).toThrow(ForbiddenException);
  });

  it('blocks service token impersonation of officeholder authority', () => {
    expect(() => {
      boundary.assertServiceTokenCannotImpersonateOfficeholder('SERVICE', 'officeholder_decision');
    }).toThrow(ForbiddenException);
  });

  it('rejects expired credentials', () => {
    expect(() => {
      boundary.assertCredentialUsable(
        {
          status: CredentialStatus.ACTIVE,
          expiresAt: new Date('2020-01-01'),
        },
        new Date('2026-01-01'),
      );
    }).toThrow(UnauthorizedException);
  });

  it('rejects revoked credentials', () => {
    expect(() => {
      boundary.assertCredentialUsable({
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
      });
    }).toThrow(UnauthorizedException);
  });

  it('rejects suspended agent credentials', () => {
    expect(() => {
      boundary.assertCredentialUsable({
        status: CredentialStatus.ACTIVE,
        identitySuspended: true,
      });
    }).toThrow(UnauthorizedException);
  });

  it('enforces break-glass expiration', () => {
    expect(() => {
      boundary.assertBreakGlassActive({
        status: BreakGlassAccessStatus.ACTIVE,
        expiresAt: new Date('2020-01-01'),
        enhancedLoggingReference: 'audit://break-glass/1',
        createsInstitutionalAuthority: false,
      });
    }).toThrow(ForbiddenException);
  });

  it('requires break-glass enhanced logging', () => {
    expect(() => {
      boundary.assertBreakGlassActive({
        status: BreakGlassAccessStatus.ACTIVE,
        expiresAt: new Date('2099-01-01'),
        enhancedLoggingReference: '',
        createsInstitutionalAuthority: false,
      });
    }).toThrow(BadRequestException);
  });

  it('blocks secret response leakage', () => {
    const sanitized = boundary.blockSecretResponseLeakage({
      id: '1',
      secret: 'super-secret',
      apiKey: 'abc123',
    });
    expect(sanitized).toEqual({ id: '1' });
  });

  it('blocks critical secret persistence in database payloads', () => {
    expect(() => {
      boundary.assertSecretNotPersisted({ password: 'hunter2' });
    }).toThrow(BadRequestException);
  });

  it('rejects unsigned release artifacts', () => {
    expect(() => {
      boundary.assertReleaseArtifactVerifiable({
        isSigned: false,
        status: ReleaseAttestationStatus.PENDING,
        buildProvenanceStatus: BuildProvenanceStatus.VERIFIED,
        artifactDigest: 'sha256:abc',
        sourceCommitSha: 'deadbeef',
      });
    }).toThrow(BadRequestException);
  });

  it('rejects unverifiable build provenance', () => {
    expect(() => {
      boundary.assertReleaseArtifactVerifiable({
        isSigned: true,
        status: ReleaseAttestationStatus.PENDING,
        buildProvenanceStatus: BuildProvenanceStatus.UNVERIFIABLE,
        artifactDigest: 'sha256:abc',
        sourceCommitSha: 'deadbeef',
      });
    }).toThrow(BadRequestException);
  });

  it('blocks production readiness when critical vulnerability is undispositioned', () => {
    const result = boundary.evaluateProductionReadiness({
      criticalUndispositionedVulnerabilities: 1,
      unsignedReleaseArtifacts: 0,
      unverifiableProvenanceRecords: 0,
      expiredExceptions: 0,
      openCriticalFindings: 0,
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain(
      CYBERSECURITY_REASON_CODES.CRITICAL_VULNERABILITY_UNDISPOSITIONED,
    );
  });

  it('enforces security exception expiration', () => {
    expect(() => {
      boundary.assertSecurityExceptionEffective({
        status: SecurityExceptionStatus.APPROVED,
        expiresAt: new Date('2020-01-01'),
        isPermanent: false,
        severity: SecurityFindingSeverity.HIGH,
      });
    }).toThrow(ForbiddenException);
  });

  it('rejects permanent exceptions by default', () => {
    expect(() => {
      boundary.assertSecurityExceptionEffective({
        status: SecurityExceptionStatus.APPROVED,
        expiresAt: new Date('2099-01-01'),
        isPermanent: true,
        severity: SecurityFindingSeverity.LOW,
      });
    }).toThrow(BadRequestException);
  });

  it('surfaces certificate expiration', () => {
    expect(() => {
      boundary.assertCertificateNotExpired(new Date('2020-01-01'));
    }).toThrow(BadRequestException);
  });

  it('preserves crypto version on rotation', () => {
    expect(() => {
      boundary.assertAlgorithmVersionPreserved('v1', '');
    }).toThrow(BadRequestException);
  });

  it('blocks overstated post-quantum security claims', () => {
    expect(() => {
      boundary.assertPostQuantumClaimsValid({
        claimsPostQuantumSecurity: true,
        postQuantumValidated: false,
        historicalVerificationPreserved: true,
        algorithmVersion: 'v1',
      });
    }).toThrow(BadRequestException);
  });

  it('requires historical signature verification preservation', () => {
    expect(() => {
      boundary.assertHistoricalVerificationPreserved(false);
    }).toThrow(BadRequestException);
  });

  it('requires controlled release for dependency changes', () => {
    expect(() => {
      boundary.assertDependencyChangeRequiresControlledRelease('1.0.0', '2.0.0', false);
    }).toThrow(BadRequestException);
  });

  it('forbids production destructive security testing', () => {
    expect(() => {
      boundary.assertSecurityTestEnvironmentAuthorized(SecurityEnvironment.PRODUCTION);
    }).toThrow(ForbiddenException);
  });

  it('forbids shared administrator accounts in production', () => {
    expect(() => {
      boundary.assertNoSharedAdministratorAccount(SecurityEnvironment.PRODUCTION, true);
    }).toThrow(BadRequestException);
  });

  it('forbids conflating authentication with institutional authority', () => {
    expect(() => {
      boundary.assertNoConflation('AUTHENTICATION', 'INSTITUTIONAL_AUTHORITY');
    }).toThrow(BadRequestException);
  });

  it('forbids conflating scan passing with accreditation', () => {
    expect(() => {
      boundary.assertNoConflation('SECURITY_SCAN_PASSING', 'SECURITY_ACCREDITATION');
    }).toThrow(BadRequestException);
  });
});
