import { Injectable } from '@nestjs/common';

import { InstrumentVerificationRateLimitedException } from '../common/exceptions/decisions-issuance.exceptions';
import { hashClientReference } from '../common/verification-code.util';
import {
  PUBLIC_VERIFICATION_RATE_LIMIT_MAX_REQUESTS,
  PUBLIC_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS,
} from '../decisions-issuance.constants';

interface RateLimitBucket {
  count: number;
  windowStartedAtMs: number;
}

@Injectable()
export class InstrumentVerificationRateLimiterService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  assertAllowed(clientReference?: string): void {
    const key = clientReference ? hashClientReference(clientReference) : 'anonymous';
    const nowMs = Date.now();
    const existing = this.buckets.get(key);

    if (
      !existing ||
      nowMs - existing.windowStartedAtMs >= PUBLIC_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS * 1000
    ) {
      this.buckets.set(key, { count: 1, windowStartedAtMs: nowMs });
      return;
    }

    if (existing.count >= PUBLIC_VERIFICATION_RATE_LIMIT_MAX_REQUESTS) {
      throw new InstrumentVerificationRateLimitedException();
    }

    existing.count += 1;
  }
}
