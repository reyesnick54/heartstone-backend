import { Injectable } from '@nestjs/common';

import { DEPARTMENT_STALE_METRICS_DISCLAIMER } from '../department-experience.constants';
import { type DepartmentMetricsFreshness } from '../types/department-context.types';

@Injectable()
export class DepartmentMetricsFreshnessService {
  buildFreshness(calculatedAt: Date, staleAfterMinutes = 60): DepartmentMetricsFreshness {
    const staleAfter = new Date(calculatedAt.getTime() + staleAfterMinutes * 60 * 1000);
    const now = new Date();

    return {
      calculatedAt: calculatedAt.toISOString(),
      staleAfter: staleAfter.toISOString(),
      isStale: now > staleAfter,
      staleDataDisclaimer: DEPARTMENT_STALE_METRICS_DISCLAIMER,
    };
  }
}
