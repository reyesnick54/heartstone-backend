import { FORBIDDEN_MEDICAL_DETAIL_FIELDS } from '../transportation.constants';

export function sanitizeMedicalReferenceForTransportation<T extends Record<string, unknown>>(
  payload: T,
): T {
  const clone = { ...payload } as Record<string, unknown>;
  for (const field of FORBIDDEN_MEDICAL_DETAIL_FIELDS) {
    Reflect.deleteProperty(clone, field);
  }
  return clone as T;
}
