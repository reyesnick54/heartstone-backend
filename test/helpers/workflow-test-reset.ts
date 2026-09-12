import { type PrismaService } from '../../src/database/prisma.service';

export async function resetWorkflowData(_prisma: PrismaService): Promise<void> {
  // Phase 6C workflow definition tables are not part of the reconciled Phase 6G schema baseline.
}
