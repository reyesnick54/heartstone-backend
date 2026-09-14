import { type PrismaService } from '../../database/prisma.service';

export async function nextSequentialReference(
  prisma: PrismaService,
  prefix: string,
  field: 'invoiceNumber' | 'paymentIntentNumber' | 'transactionNumber' | 'receiptNumber',
  model:
    | 'invoice'
    | 'paymentIntent'
    | 'paymentTransaction'
    | 'paymentReceipt',
): Promise<string> {
  const latest = await (prisma[model] as { findFirst: (args: unknown) => Promise<Record<string, string> | null> }).findFirst({
    where: { [field]: { startsWith: `${prefix}-` } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });

  const latestNumber = latest?.[field]?.match(/-(\d+)$/)?.[1];
  const next = latestNumber ? Number.parseInt(latestNumber, 10) + 1 : 1;
  return `${prefix}-${String(next).padStart(8, '0')}`;
}
