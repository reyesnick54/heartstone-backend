import { RedisService } from '../src/redis/redis.service';

export const createRedisServiceMock = (): {
  onModuleInit: jest.Mock;
  onModuleDestroy: jest.Mock;
  ping: jest.Mock;
  getClient: jest.Mock;
  isConnected: jest.Mock;
} => ({
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  getClient: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
});

export const overrideRedisService = (
  builder: {
    overrideProvider: (token: unknown) => {
      useValue: (value: unknown) => unknown;
    };
  },
  redisServiceMock = createRedisServiceMock(),
) => builder.overrideProvider(RedisService).useValue(redisServiceMock);
