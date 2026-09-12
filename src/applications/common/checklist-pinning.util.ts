import { createHash } from 'node:crypto';

export interface PinnedChecklistItem {
  id: string;
  itemCode: string;
  label: string;
  isRequired: boolean;
}

export function buildChecklistConfigurationFingerprint(
  serviceVersionId: string,
  items: PinnedChecklistItem[],
): string {
  const payload = {
    serviceVersionId,
    items: [...items]
      .map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        isRequired: item.isRequired,
      }))
      .sort((left, right) => left.itemCode.localeCompare(right.itemCode)),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
