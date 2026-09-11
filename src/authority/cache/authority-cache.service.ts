import { Injectable } from '@nestjs/common';
import { AuthorityEvaluationResult } from '@prisma/client';

import { RedisService } from '../../redis/redis.service';
import { AUTHORITY_CACHE_TTL_SECONDS } from '../common/authority.constants';
import { AuthorityEvaluationRequest } from '../common/authority.types';
import { AuthorityEvaluationService } from '../evaluation/authority-evaluation.service';

export interface CachedAuthorityResult {
  recordId: string;
  result: AuthorityEvaluationResult;
  cachedAt: string;
}

@Injectable()
export class AuthorityCacheService {
  constructor(
    private readonly redis: RedisService,
    private readonly evaluation: AuthorityEvaluationService,
  ) {}

  private cacheKey(request: AuthorityEvaluationRequest): string {
    return [
      'authority:eval',
      request.functionCode,
      request.officeholderId ?? 'none',
      request.requestedAction,
      request.appointmentId ?? 'none',
      request.delegationId ?? 'none',
    ].join(':');
  }

  async getCachedAllow(request: AuthorityEvaluationRequest): Promise<CachedAuthorityResult | null> {
    let client;
    try {
      client = this.redis.getClient();
    } catch {
      return null;
    }

    const raw = await client.get(this.cacheKey(request));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CachedAuthorityResult;
  }

  async evaluateWithCache(request: AuthorityEvaluationRequest): Promise<{
    recordId: string;
    result: AuthorityEvaluationResult;
    fromCache: boolean;
  }> {
    const cached = await this.getCachedAllow(request);
    if (cached?.result === AuthorityEvaluationResult.ALLOWED) {
      return {
        recordId: cached.recordId,
        result: cached.result,
        fromCache: true,
      };
    }

    const outcome = await this.evaluation.evaluate(request);

    if (outcome.result === AuthorityEvaluationResult.ALLOWED) {
      await this.storeAllow(request, outcome.recordId, outcome.result);
    }

    return {
      recordId: outcome.recordId,
      result: outcome.result,
      fromCache: false,
    };
  }

  async storeAllow(
    request: AuthorityEvaluationRequest,
    recordId: string,
    result: AuthorityEvaluationResult,
  ): Promise<void> {
    if (result !== AuthorityEvaluationResult.ALLOWED) {
      return;
    }

    let client;
    try {
      client = this.redis.getClient();
    } catch {
      return;
    }

    const payload: CachedAuthorityResult = {
      recordId,
      result,
      cachedAt: new Date().toISOString(),
    };

    await client.setex(this.cacheKey(request), AUTHORITY_CACHE_TTL_SECONDS, JSON.stringify(payload));
  }

  async invalidateForFunction(functionCode: string): Promise<void> {
    let client;
    try {
      client = this.redis.getClient();
    } catch {
      return;
    }

    const pattern = `authority:eval:${functionCode}:*`;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  async invalidateForOfficeholder(officeholderId: string): Promise<void> {
    let client;
    try {
      client = this.redis.getClient();
    } catch {
      return;
    }

    const pattern = `authority:eval:*:${officeholderId}:*`;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  async invalidateAll(): Promise<void> {
    let client;
    try {
      client = this.redis.getClient();
    } catch {
      return;
    }

    const keys = await client.keys('authority:eval:*');
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
