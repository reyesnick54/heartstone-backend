import { type PrismaService } from '../../src/database/prisma.service';

export async function resetFinancialData(prisma: PrismaService): Promise<void> {
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feeAssessment.deleteMany();
  await prisma.feeScheduleItem.deleteMany();
  await prisma.feeScheduleVersion.deleteMany();
  await prisma.feeSchedule.deleteMany();
  await prisma.financialAccountReference.deleteMany();
  await prisma.financialAuditEvent.deleteMany();
}
