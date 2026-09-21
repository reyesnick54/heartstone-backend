export function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectKeys(record[key]);
        return acc;
      }, {});
  }

  return value;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

export function formatServicePackManifest(value: unknown, indent = 2): string {
  const sorted = sortObjectKeys(value);
  return `${JSON.stringify(sorted, null, indent)}\n`;
}
