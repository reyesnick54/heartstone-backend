import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CONFIG_KEY, RedisConfig } from '../config/redis.config';
import { RedisService } from './redis.service';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: {
    connect: jest.Mock;
    quit: jest.Mock;
    ping: jest.Mock;
    on: jest.Mock;
    status: string;
  };

  const redisConfig: RedisConfig = {
    host: 'localhost',
    port: 6379,
    db: 0,
  };

  beforeEach(async () => {
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      ping: jest.fn().mockResolvedValue('PONG'),
      on: jest.fn(),
      status: 'ready',
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(redisConfig),
          },
        },
      ],
    }).compile();

    service = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a Redis client from environment-backed config', async () => {
    await service.onModuleInit();

    expect(Redis).toHaveBeenCalledWith({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      lazyConnect: true,
    });
    expect(mockRedisClient.connect).toHaveBeenCalled();
    expect(mockRedisClient.on).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(mockRedisClient.on).toHaveBeenCalledWith(
      'connect',
      expect.any(Function),
    );
  });

  it('logs connection failures without throwing during startup', async () => {
    const connectionError = new Error('connection refused');
    mockRedisClient.connect.mockRejectedValueOnce(connectionError);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('returns the underlying client when connected', async () => {
    await service.onModuleInit();

    expect(service.getClient()).toBe(mockRedisClient);
    expect(service.isConnected()).toBe(true);
  });

  it('pings Redis', async () => {
    await service.onModuleInit();

    await expect(service.ping()).resolves.toBe('PONG');
    expect(mockRedisClient.ping).toHaveBeenCalled();
  });

  it('closes the Redis connection on shutdown', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockRedisClient.quit).toHaveBeenCalled();
    expect(service.isConnected()).toBe(false);
  });

  it('uses the configured Redis namespace key', async () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        expect(key).toBe(REDIS_CONFIG_KEY);
        return redisConfig;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    await module.get(RedisService).onModuleInit();
  });
});
