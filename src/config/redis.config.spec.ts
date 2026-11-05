import { parseRedisUrl } from './redis.config';

describe('parseRedisUrl', () => {
  it('reads host, port, password and database from a managed-service URL', () => {
    expect(parseRedisUrl('redis://default:s3cr%40t@red-abc123:6380/2')).toEqual({
      host: 'red-abc123',
      port: 6380,
      password: 's3cr@t',
      db: 2,
    });
  });

  it('defaults the port and database', () => {
    expect(parseRedisUrl('rediss://red-abc123')).toEqual({
      host: 'red-abc123',
      port: 6379,
      password: undefined,
      db: 0,
    });
  });

  it('rejects other schemes', () => {
    expect(() => parseRedisUrl('http://red-abc123')).toThrow('redis://');
  });
});
