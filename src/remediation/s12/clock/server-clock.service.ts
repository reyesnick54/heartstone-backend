import { Injectable, Optional } from '@nestjs/common';

export const SERVER_CLOCK_OVERRIDE = 'SERVER_CLOCK_OVERRIDE';

export interface ServerClockOverride {
  nowMs: number;
}

@Injectable()
export class ServerClockService {
  constructor(@Optional() private readonly override?: ServerClockOverride) {}

  now(): Date {
    if (this.override) {
      return new Date(this.override.nowMs);
    }
    return new Date();
  }

  nowMs(): number {
    return this.now().getTime();
  }
}
