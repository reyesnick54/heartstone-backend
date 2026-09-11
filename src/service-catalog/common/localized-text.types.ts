import { type Prisma } from '@prisma/client';

export type LocalizedText = Prisma.JsonObject & {
  default?: string;
  translations?: Record<string, string>;
};

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.default === 'string') {
    return true;
  }

  if (typeof record.translations === 'object' && record.translations !== null) {
    return Object.values(record.translations as Record<string, unknown>).every(
      (entry) => typeof entry === 'string',
    );
  }

  return Object.values(record).every((entry) => typeof entry === 'string');
}

export function resolveLocalizedText(value: LocalizedText, locale = 'default'): string {
  if (typeof value.default === 'string' && locale === 'default') {
    return value.default;
  }

  const translations = value.translations;
  if (translations && typeof translations[locale] === 'string') {
    return translations[locale];
  }

  if (typeof value.default === 'string') {
    return value.default;
  }

  const firstTranslation = translations ? Object.values(translations)[0] : undefined;
  if (typeof firstTranslation === 'string') {
    return firstTranslation;
  }

  const firstValue = Object.values(value).find((entry) => typeof entry === 'string');
  return typeof firstValue === 'string' ? firstValue : '';
}
