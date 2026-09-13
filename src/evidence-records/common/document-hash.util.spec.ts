import { hashDocumentContent } from './document-hash.util';

describe('hashDocumentContent', () => {
  it('produces deterministic SHA-256 for identical bytes', () => {
    const content = Buffer.from('heartstone document bytes');
    expect(hashDocumentContent(content)).toBe(hashDocumentContent(content));
    expect(hashDocumentContent(content)).toHaveLength(64);
  });

  it('changes when bytes change', () => {
    const a = hashDocumentContent(Buffer.from('version-one'));
    const b = hashDocumentContent(Buffer.from('version-two'));
    expect(a).not.toBe(b);
  });
});
