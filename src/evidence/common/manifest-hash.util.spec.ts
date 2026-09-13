import { canonicalizeManifest, hashManifest } from './manifest-hash.util';

describe('manifest-hash.util', () => {
  const baseManifest = {
    packetVersionId: 'version-1',
    packetId: 'packet-1',
    version: 1,
    evidenceCutoffAt: '2026-09-12T12:00:00.000Z',
    items: [
      {
        itemId: 'item-2',
        evidenceRecordId: 'record-2',
        evidenceStatusAtInclusion: 'ACTIVE',
        documentVersionId: 'doc-2',
        documentContentHash: 'hash-2',
        inclusionOrder: 1,
        isExplicitlyExcluded: false,
        exclusionRecordId: null,
        verificationRecordIds: [],
        acceptanceRecordIds: [],
        departmentalReviewId: null,
        governmentCommunicationId: null,
        professionalReviewId: null,
        inspectionRecordId: null,
        limitations: null,
      },
      {
        itemId: 'item-1',
        evidenceRecordId: 'record-1',
        evidenceStatusAtInclusion: 'DISPUTED',
        documentVersionId: 'doc-1',
        documentContentHash: 'hash-1',
        inclusionOrder: 0,
        isExplicitlyExcluded: false,
        exclusionRecordId: null,
        verificationRecordIds: ['verify-1'],
        acceptanceRecordIds: [],
        departmentalReviewId: null,
        governmentCommunicationId: null,
        professionalReviewId: null,
        inspectionRecordId: null,
        limitations: 'Expired at inclusion',
      },
    ],
    exclusions: [],
  };

  it('produces deterministic canonical JSON regardless of item input order', () => {
    const reordered = {
      ...baseManifest,
      items: [...baseManifest.items].reverse(),
    };
    expect(canonicalizeManifest(baseManifest)).toBe(canonicalizeManifest(reordered));
  });

  it('changes manifest hash when packet content changes', () => {
    const originalHash = hashManifest(baseManifest);
    const firstItem = baseManifest.items[0];
    const secondItem = baseManifest.items[1];
    if (!firstItem || !secondItem) {
      throw new Error('expected manifest items');
    }
    const changedItem = { ...firstItem, documentContentHash: 'different-hash' };
    const changedHash = hashManifest({
      ...baseManifest,
      items: [changedItem, secondItem],
    });
    expect(originalHash).not.toBe(changedHash);
  });

  it('produces stable hash for identical manifests', () => {
    expect(hashManifest(baseManifest)).toBe(hashManifest(baseManifest));
  });
});
