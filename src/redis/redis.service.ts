import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CONFIG_KEY, RedisConfig } from '../config/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const config = this.configService.getOrThrow<RedisConfig>(REDIS_CONFIG_KEY);

    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      lazyConnect: true,
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(
        `Redis connection error: ${error.message}`,
        error.stack,
      );
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    try {
      await this.client.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to Redis: ${message}`, stack);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error closing Redis connection: ${message}`, stack);
    } finally {
      this.client = null;
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }

    return this.client;
  }

  async ping(): Promise<string> {
    return this.getClient().ping();
  }

  isConnected(): boolean {
    return this.client?.status === 'ready';
  }
}
