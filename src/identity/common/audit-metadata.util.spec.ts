import { sanitizeAuditMetadata } from './audit-metadata.util';

describe('sanitizeAuditMetadata', () => {
  it('redacts sensitive keys and preserves safe metadata', () => {
    const sanitized = sanitizeAuditMetadata({
      username: 'alice',
      password: 'secret-value',
      bearerToken: 'abc123',
      nested: {
        apiKey: 'key-value',
        officeholderId: 'uuid',
      },
    });

    expect(sanitized).toEqual({
      username: 'alice',
      password: '[REDACTED]',
      bearerToken: '[REDACTED]',
      nested: {
        apiKey: '[REDACTED]',
        officeholderId: 'uuid',
      },
    });
  });
});
