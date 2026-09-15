import {
  BreakGlassAccessStatus,
  BuildProvenanceStatus,
  CredentialStatus,
  ReleaseAttestationStatus,
  SecurityControlImplementationStatus,
  SecurityEnvironment,
  SecurityExceptionStatus,
  SecurityFindingSeverity,
  SecurityTestCategory,
} from '@prisma/client';

import { CybersecurityBoundaryService } from '../src/cybersecurity/common/cybersecurity-boundary.service';
import { SecurityControlService } from '../src/cybersecurity/controls/security-control.service';
import { CryptographicService } from '../src/cybersecurity/cryptography/cryptographic.service';
import { PrivilegedAccessService } from '../src/cybersecurity/privileged-access/privileged-access.service';
import { ProductionReadinessService } from '../src/cybersecurity/readiness/production-readiness.service';
import { SupplyChainService } from '../src/cybersecurity/supply-chain/supply-chain.service';
import { SecurityTestingService } from '../src/cybersecurity/testing/security-testing.service';
import {
  createIntegrationApp,
  resetCybersecurityData,
  resetIdentityData,
} from './helpers/integration-app';
import { seedPhase13BFixture } from './helpers/phase-13b-test-fixtures';

describe('Phase 13B cybersecurity integration', () => {
  it('records control implementation with required governance fields and enforces exception expiration', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const securityControls = app.get(SecurityControlService);
    const boundary = app.get(CybersecurityBoundaryService);

    const implementation = await securityControls.createImplementation({
      controlDefinitionId: fixture.controlDefinitionId,
      assetId: fixture.assetId,
      ownerIdentityId: fixture.ownerIdentityId,
      requirementSource: 'Phase 13B baseline',
      implementationDescription: 'Gitleaks secret scanning in CI',
      environment: SecurityEnvironment.PRODUCTION,
      testMethod: 'CI secret scan on every push',
      status: SecurityControlImplementationStatus.IMPLEMENTED,
    });

    expect(implementation.testMethod).toBeTruthy();
    expect(implementation.evidenceReference).toBeNull();

    const exception = await securityControls.requestException(
      {
        controlDefinitionId: fixture.controlDefinitionId,
        implementationId: implementation.id,
        businessJustification: 'Temporary scanner outage',
        scopeDescription: 'Single pipeline',
        compensatingControls: 'Manual review',
        riskDescription: 'Limited exposure window',
        ownerIdentityId: fixture.ownerIdentityId,
        severity: SecurityFindingSeverity.HIGH,
        expiresAt: new Date('2099-01-01'),
        reviewDate: new Date('2099-06-01'),
      },
      {},
    );

    await securityControls.approveException(exception.id, {
      approverIdentityId: fixture.ownerIdentityId,
    });

    await prisma.securityException.update({
      where: { id: exception.id },
      data: { expiresAt: new Date('2020-01-01') },
    });

    const enforcement = await securityControls.enforceExceptionExpiration(new Date('2026-01-01'));
    expect(enforcement.expiredCount).toBe(1);

    const updated = await prisma.securityException.findUnique({ where: { id: exception.id } });
    expect(updated?.status).toBe(SecurityExceptionStatus.EXPIRED);

    expect(() => {
      boundary.assertSecurityExceptionEffective({
        status: SecurityExceptionStatus.EXPIRED,
        expiresAt: new Date('2020-01-01'),
        isPermanent: false,
        severity: SecurityFindingSeverity.HIGH,
      });
    }).toThrow();

    await app.close();
  });

  it('rejects unsigned releases and blocks production readiness until dispositioned', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const supplyChain = app.get(SupplyChainService);
    const readiness = app.get(ProductionReadinessService);

    await expect(
      supplyChain.createReleaseAttestation(
        {
          releaseReference: 'release-13b-001',
          sourceCommitSha: 'abc123def456',
          buildProvenanceId: fixture.buildProvenanceId,
          artifactDigest: 'sha256:artifact001',
          isSigned: false,
        },
        {},
      ),
    ).rejects.toThrow('Unsigned release artifacts are rejected');

    const attestation = await prisma.releaseArtifactAttestation.create({
      data: {
        attestationNumber: 'RATT-PH13B-001',
        releaseReference: 'release-13b-001',
        sourceCommitSha: 'abc123def456',
        buildProvenanceId: fixture.buildProvenanceId,
        artifactDigest: 'sha256:artifact001',
        isSigned: false,
        status: ReleaseAttestationStatus.PENDING,
      },
    });
    expect(attestation.isSigned).toBe(false);

    await prisma.dependencyVulnerabilityRecord.create({
      data: {
        recordNumber: 'DVUL-PH13B-001',
        packageName: 'example-lib',
        packageVersion: '1.0.0',
        severity: SecurityFindingSeverity.CRITICAL,
        isProductionBlocking: true,
        ownerIdentityId: fixture.ownerIdentityId,
      },
    });

    const blocked = await readiness.evaluateProductionReadinessGate();
    expect(blocked.status).toBe('BLOCKED');

    await app.close();
  });

  it('activates and expires break-glass with audit logging', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const privilegedAccess = app.get(PrivilegedAccessService);

    const event = await privilegedAccess.requestBreakGlass(
      {
        actorIdentityId: fixture.ownerIdentityId,
        reason: 'Production database connectivity failure',
        approvedScope: 'Read-only diagnostics',
        environment: SecurityEnvironment.PRODUCTION,
        expiresAt: new Date(Date.now() + 60_000),
      },
      {},
    );

    const activated = await privilegedAccess.activateBreakGlass(event.id, {
      approverIdentityId: fixture.ownerIdentityId,
      enhancedLoggingReference: 'audit://break-glass/ph13b/001',
    });
    expect(activated.status).toBe(BreakGlassAccessStatus.ACTIVE);

    const auditEvents = await prisma.securityAuditEvent.findMany({
      where: { eventType: 'PROTECTED_ENDPOINT_ACCESS' },
    });
    expect(auditEvents.some((event) => event.metadata && typeof event.metadata === 'object')).toBe(
      true,
    );

    await prisma.breakGlassAccessEvent.update({
      where: { id: event.id },
      data: { expiresAt: new Date('2020-01-01') },
    });
    const expiration = await privilegedAccess.enforceBreakGlassExpiration(new Date('2026-01-01'));
    expect(expiration.expiredCount).toBe(1);

    await app.close();
  });

  it('preserves crypto version and blocks overstated PQC claims', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const crypto = app.get(CryptographicService);

    const keyRef = await crypto.registerKeyReference({
      secretManagerReference: 'secret-manager://prod/signing-key-v1',
      algorithm: 'RSA-2048',
      keyPurpose: 'Document signing',
      effectiveFrom: new Date('2025-01-01'),
    });

    const asset = await crypto.registerAsset(
      {
        name: 'Decision signing key',
        algorithm: 'RSA',
        algorithmVersion: 'v1',
        purpose: 'Decision signature',
        dataOrSystemReference: 'decisions/signing',
        keyReferenceId: keyRef.id,
        ownerIdentityId: fixture.ownerIdentityId,
        effectiveFrom: new Date('2025-01-01'),
        claimsPostQuantumSecurity: false,
      },
      {},
    );

    const rotated = await crypto.rotateAsset(asset.id, {
      nextAlgorithm: 'RSA',
      nextAlgorithmVersion: 'v2',
      nextKeyReferenceId: keyRef.id,
      historicalVerificationPreserved: true,
    });
    expect(rotated.algorithmVersion).toBe('v2');
    expect(rotated.historicalVerificationPreserved).toBe(true);

    await expect(
      crypto.registerAsset(
        {
          name: 'Invalid PQ claim',
          algorithm: 'ML-DSA',
          algorithmVersion: 'v1',
          purpose: 'Testing',
          dataOrSystemReference: 'test/pq',
          ownerIdentityId: fixture.ownerIdentityId,
          effectiveFrom: new Date('2025-01-01'),
          claimsPostQuantumSecurity: true,
        },
        {},
      ),
    ).rejects.toThrow();

    await app.close();
  });

  it('records authorized security tests and revokes suspended agent credentials', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const testing = app.get(SecurityTestingService);
    const privilegedAccess = app.get(PrivilegedAccessService);

    const execution = await testing.recordExecution({
      category: SecurityTestCategory.AUTHORIZATION_BYPASS,
      environment: SecurityEnvironment.TEST,
      executorIdentityId: fixture.ownerIdentityId,
      targetReference: 'test://phase-13b/authz',
      passed: true,
    });
    expect(execution.environment).toBe(SecurityEnvironment.TEST);

    await expect(
      testing.recordExecution({
        category: SecurityTestCategory.IDOR,
        environment: SecurityEnvironment.PRODUCTION,
        executorIdentityId: fixture.ownerIdentityId,
        targetReference: 'prod://forbidden',
        passed: true,
      }),
    ).rejects.toThrow();

    await privilegedAccess.revokeSuspendedAgentCredential(fixture.credentialId);
    const credential = await prisma.credential.findUnique({ where: { id: fixture.credentialId } });
    expect(credential?.status).toBe(CredentialStatus.REVOKED);

    await app.close();
  });

  it('requires controlled release for dependency changes', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const supplyChain = app.get(SupplyChainService);

    await expect(
      supplyChain.recordDependencyChange({
        componentId: fixture.componentId,
        previousVersion: '11.0.1',
        nextVersion: '12.0.0',
      }),
    ).rejects.toThrow();

    const updated = await supplyChain.recordDependencyChange({
      componentId: fixture.componentId,
      previousVersion: '11.0.1',
      nextVersion: '11.0.2',
      controlledReleaseReference: 'change-control/CC-13B-001',
    });
    expect(updated.version).toBe('11.0.2');

    await app.close();
  });

  it('rejects unverifiable build provenance during verification', async () => {
    const { app, prisma } = await createIntegrationApp();
    await resetCybersecurityData(prisma);
    await resetIdentityData(prisma);
    const fixture = await seedPhase13BFixture(prisma);

    const unverifiable = await prisma.buildProvenanceRecord.create({
      data: {
        provenanceCode: 'BPRV-PH13B-UNVERIFIABLE',
        sourceCommitSha: 'bad000',
        buildId: 'build-bad',
        buildSystem: 'unknown',
        artifactDigest: 'sha256:bad',
        status: BuildProvenanceStatus.UNVERIFIABLE,
        ownerIdentityId: fixture.ownerIdentityId,
      },
    });

    const supplyChain = app.get(SupplyChainService);
    await expect(supplyChain.verifyBuildProvenance(unverifiable.id)).rejects.toThrow(
      'Unverifiable build provenance is rejected',
    );

    await app.close();
  });
});
