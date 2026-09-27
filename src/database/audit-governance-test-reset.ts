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
