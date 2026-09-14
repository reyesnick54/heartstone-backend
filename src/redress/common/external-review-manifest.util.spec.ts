import {
  canonicalizeExternalReviewPackageManifest,
  hashExternalReviewPackageManifest,
} from './external-review-manifest.util';

describe('external-review-manifest.util', () => {
  const baseManifest = {
    referralId: 'referral-1',
    packageVersion: 1,
    evidencePacketVersionId: 'packet-version-1',
    evidencePacketManifestHash: 'abc123',
    routeVersion: 'v1.0.0',
    securityClassification: 'OFFICIAL',
    documentVersionPins: [
      {
        evidenceRecordId: 'record-2',
        documentVersionId: 'doc-version-2',
        inclusionOrder: 2,
      },
      {
        evidenceRecordId: 'record-1',
        documentVersionId: 'doc-version-1',
        inclusionOrder: 1,
      },
    ],
  };

  it('produces deterministic manifest hash', () => {
    const hashA = hashExternalReviewPackageManifest(baseManifest);
    const hashB = hashExternalReviewPackageManifest(baseManifest);
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('sorts document pins by inclusion order in canonical form', () => {
    const canonical = canonicalizeExternalReviewPackageManifest(baseManifest);
    const parsed = JSON.parse(canonical) as {
      documentVersionPins: { evidenceRecordId: string }[];
    };
    expect(parsed.documentVersionPins[0]?.evidenceRecordId).toBe('record-1');
    expect(parsed.documentVersionPins[1]?.evidenceRecordId).toBe('record-2');
  });

  it('changes hash when security classification changes', () => {
    const hashA = hashExternalReviewPackageManifest(baseManifest);
    const hashB = hashExternalReviewPackageManifest({
      ...baseManifest,
      securityClassification: 'PROTECTED',
    });
    expect(hashA).not.toBe(hashB);
  });
});
