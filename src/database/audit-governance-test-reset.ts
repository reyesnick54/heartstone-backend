import { type PrismaService } from './prisma.service';

/**
 * Test-only cleanup for append-only audit tables. Row DELETE is blocked by DB trigger;
 * TRUNCATE is used in the test harness only.
 */
export async function resetAuditGovernanceData(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "governed_configuration_effective_versions", "governed_configuration_changes", "government_audit_ledger_entries" RESTART IDENTITY CASCADE',
  );
}

/** Test-only: remove ledger rows that reference identities about to be deleted. */
export async function purgeAuditLedgerForActorIdentities(
  prisma: PrismaService,
  identityIds: readonly string[],
): Promise<void> {
  if (identityIds.length === 0) {
    return;
  }

  await prisma.$executeRawUnsafe(
    'ALTER TABLE "government_audit_ledger_entries" DISABLE TRIGGER "government_audit_ledger_append_only"',
  );
  await prisma.governmentAuditLedgerEntry.deleteMany({
    where: { actorIdentityId: { in: [...identityIds] } },
  });
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "government_audit_ledger_entries" ENABLE TRIGGER "government_audit_ledger_append_only"',
  );
}
