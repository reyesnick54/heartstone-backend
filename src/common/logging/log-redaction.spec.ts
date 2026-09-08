import { REDACTED_VALUE, redactSensitiveObject, redactSensitiveValue } from './log-redaction';

describe('log redaction', () => {
  it('redacts sensitive keys', () => {
    const result = redactSensitiveObject({
      username: 'alice',
      password: 'super-secret',
      apiKey: 'abc123',
    });

    expect(result).toEqual({
      username: 'alice',
      password: REDACTED_VALUE,
      apiKey: REDACTED_VALUE,
    });
  });

  it('redacts bearer tokens in values', () => {
    expect(
      redactSensitiveValue('authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
    ).toBe(REDACTED_VALUE);
  });

  it('preserves non-sensitive values', () => {
    expect(redactSensitiveValue('status', 'ready')).toBe('ready');
  });
});
