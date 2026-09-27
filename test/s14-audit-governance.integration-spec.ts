import { type INestApplication } from '@nestjs/common';
import {
  GovernedConfigurationDomain,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { GovernedConfigurationChangeService } from '../src/audit-governance/configuration/governed-configuration-change.service';
import { GovernmentAuditLedgerService } from '../src/audit-governance/ledger/government-audit-ledger.service';
import { GovernmentAuditLedgerVerificationService } from '../src/audit-governance/ledger/government-audit-ledger-verification.service';
import { type PrismaService } from '../src/database/prisma.service';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

describe('S14 audit governance (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ledger: GovernmentAuditLedgerService;
  let verification: GovernmentAuditLedgerVerificationService;
  let governedConfiguration: GovernedConfigurationChangeService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    ledger = app.get(GovernmentAuditLedgerService);
    verification = app.get(GovernmentAuditLedgerVerificationService);
    governedConfiguration = app.get(GovernedConfigurationChangeService);
  });

  beforeEach(async () => {
    await resetGovernmentData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedInstitution() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'S14-JUR',
        name: 'S14 Jurisdiction',
        type: JurisdictionType.NATIONAL,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'S14-INST',
        name: 'S14 Institution',
        type: InstitutionType.MINISTRY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    return { jurisdiction, institution };
  }

  it('preserves ledger rows when institution parent delete is attempted', async () => {
    const { institution } = await seedInstitution();
    const proposer = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 's14-proposer@test.gov',
      password: 'S14Test123!',
      givenName: 'S14',
      familyName: 'Proposer',
      displayName: 'S14 Proposer',
    });

    await ledger.append({
      ledgerStreamKey: `institution:${institution.id}`,
      institutionId: institution.id,
      actorIdentityId: proposer.identityId,
      eventType: 'ADMINISTRATIVE_CHANGE',
      action: 'TEST_APPEND',
      outcome: 'OK',
    });

    await expect(prisma.institution.delete({ where: { id: institution.id } })).rejects.toThrow();

    const count = await prisma.governmentAuditLedgerEntry.count({
      where: { institutionId: institution.id },
    });
    expect(count).toBe(1);
  });

  it('verifies hash chains and detects tampering', async () => {
    const stream = 'platform';
    await ledger.append({
      ledgerStreamKey: stream,
      eventType: 'SECURITY_EVENT',
      action: 'CHAIN_A',
      outcome: 'OK',
    });
    await ledger.append({
      ledgerStreamKey: stream,
      eventType: 'SECURITY_EVENT',
      action: 'CHAIN_B',
      outcome: 'OK',
    });

    const intact = await verification.verifyStream({ ledgerStreamKey: stream });
    expect(intact.intact).toBe(true);

    const first = await prisma.governmentAuditLedgerEntry.findFirst({
      where: { ledgerStreamKey: stream },
      orderBy: { sequenceNumber: 'asc' },
    });
    expect(first).not.toBeNull();

    await expect(
      prisma.governmentAuditLedgerEntry.update({
        where: { id: first?.id ?? '' },
        data: { action: 'TAMPERED' },
      }),
    ).rejects.toThrow(/append-only/i);
  });

  it('serializes concurrent appends into a valid chain', async () => {
    const stream = 'platform';
    await Promise.all(
      Array.from({ length: 8 }).map((_, index) =>
        ledger.append({
          ledgerStreamKey: stream,
          eventType: 'SECURITY_EVENT',
          action: `CONCURRENT_${String(index)}`,
          outcome: 'OK',
        }),
      ),
    );

    const result = await verification.verifyStream({ ledgerStreamKey: stream });
    expect(result.intact).toBe(true);
    expect(result.entriesVerified).toBe(8);
  });

  it('enforces configuration segregation, effective dating, and rollback history', async () => {
    const { jurisdiction, institution } = await seedInstitution();
    const proposer = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 's14-config-proposer@test.gov',
      password: 'S14Test123!',
      givenName: 'Config',
      familyName: 'Proposer',
      displayName: 'Config Proposer',
    });
    const approver = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 's14-config-approver@test.gov',
      password: 'S14Test123!',
      givenName: 'Config',
      familyName: 'Approver',
      displayName: 'Config Approver',
    });

    const future = new Date(Date.now() + 7 * 86_400_000);
    const draft = await governedConfiguration.createDraft({
      institutionId: institution.id,
      jurisdictionId: jurisdiction.id,
      configurationDomain: GovernedConfigurationDomain.SLA_RULES,
      configurationKey: 'response-time',
      proposedPayload: { hours: 48 },
      proposerIdentityId: proposer.identityId,
    });

    await governedConfiguration.submitForReview({
      changeId: draft.id,
      actorIdentityId: proposer.identityId,
    });
    await governedConfiguration.beginReview(draft.id, proposer.identityId);

    await expect(
      governedConfiguration.approve({
        changeId: draft.id,
        approverIdentityId: proposer.identityId,
        scheduledEffectiveAt: future,
      }),
    ).rejects.toThrow(/segregation of duties/i);

    const scheduled = await governedConfiguration.approve({
      changeId: draft.id,
      approverIdentityId: approver.identityId,
      scheduledEffectiveAt: future,
    });

    const notYet = await governedConfiguration.resolveEffectiveConfiguration({
      institutionId: institution.id,
      configurationDomain: GovernedConfigurationDomain.SLA_RULES,
      configurationKey: 'response-time',
      at: new Date(),
    });
    expect(notYet).toBeNull();

    await governedConfiguration.activateDueChanges(future);

    const effective = await governedConfiguration.resolveEffectiveConfiguration({
      institutionId: institution.id,
      configurationDomain: GovernedConfigurationDomain.SLA_RULES,
      configurationKey: 'response-time',
      at: future,
    });
    expect(effective?.payload).toEqual({ hours: 48 });

    const effectiveChange = await prisma.governedConfigurationChange.findFirst({
      where: { id: scheduled.id },
    });
    expect(effectiveChange?.status).toBe('EFFECTIVE');
    if (!effectiveChange) {
      throw new Error('Expected effective configuration change');
    }

    const rollback = await governedConfiguration.rollback({
      institutionId: institution.id,
      jurisdictionId: jurisdiction.id,
      configurationDomain: GovernedConfigurationDomain.SLA_RULES,
      configurationKey: 'response-time',
      rollbackOfChangeId: effectiveChange.id,
      proposerIdentityId: proposer.identityId,
      approverIdentityId: approver.identityId,
      proposedPayload: { hours: 24 },
    });

    expect(rollback.status).toBe('EFFECTIVE');

    const history = await prisma.governedConfigurationChange.findMany({
      where: { institutionId: institution.id, configurationKey: 'response-time' },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.some((row) => row.status === 'ROLLED_BACK')).toBe(true);
  });
});
