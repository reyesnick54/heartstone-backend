import { MARITIME_INVARIANTS } from './maritime.constants';
import {
  FORBIDDEN_EMBEDDED_NATIONAL_MARITIME_TERMS,
  MARITIME_FOUNDATION_ENUM_NAMES,
  MARITIME_FOUNDATION_MODEL_NAMES,
} from './maritime-schema.constants';

describe('Maritime schema constants', () => {
  it('declares canonical foundation models including VesselRecord', () => {
    expect(MARITIME_FOUNDATION_MODEL_NAMES).toContain('VesselRecord');
    expect(MARITIME_FOUNDATION_MODEL_NAMES).toContain('MaritimeVesselInspectionReference');
  });

  it('uses jurisdiction-neutral enums without embedded national maritime law', () => {
    const serialized = JSON.stringify(MARITIME_FOUNDATION_ENUM_NAMES);
    for (const term of FORBIDDEN_EMBEDDED_NATIONAL_MARITIME_TERMS) {
      expect(serialized.toLowerCase()).not.toContain(term);
    }
  });

  it('documents maritime invariants in constants', () => {
    expect(MARITIME_INVARIANTS.vesselRecordCanonical).toBe(true);
    expect(MARITIME_INVARIANTS.noHardcodedNationalMaritimeLaw).toBe(true);
  });
});
