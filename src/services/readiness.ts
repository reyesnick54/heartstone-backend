import type { AppDependencies, ReadinessReport } from '../infrastructure/types';

export class ReadinessService {
  constructor(private readonly dependencies: AppDependencies) {}

  async evaluate(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([
      this.dependencies.database.check(),
      this.dependencies.redis.check(),
    ]);

    const isReady = database.status === 'ok' && redis.status === 'ok';
    const messages: ReadinessReport['messages'] = {};

    if (database.message) {
      messages.database = database.message;
    }

    if (redis.message) {
      messages.redis = redis.message;
    }

    return {
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        database: database.status,
        redis: redis.status,
      },
      ...(Object.keys(messages).length > 0 ? { messages } : {}),
    };
  }
}
