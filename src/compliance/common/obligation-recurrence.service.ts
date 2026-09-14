import { Injectable } from '@nestjs/common';

import {
  ALLOWED_RECURRENCE_RULE_TYPES,
  type ControlledRecurrenceConfiguration,
} from '../compliance.constants';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface GeneratedOccurrence {
  occurrenceNumber: number;
  scheduledDueDate: Date;
  lawfulDueDate: Date;
}

@Injectable()
export class ObligationRecurrenceService {
  constructor(private readonly boundary: ComplianceBoundaryService) {}

  generateOccurrences(input: {
    startDate: Date;
    initialDueDate?: Date | null;
    recurrenceConfiguration?: unknown;
    throughDate: Date;
  }): GeneratedOccurrence[] {
    if (!input.recurrenceConfiguration) {
      const due = input.initialDueDate ?? input.startDate;
      if (due > input.throughDate) {
        return [];
      }
      return [
        {
          occurrenceNumber: 1,
          scheduledDueDate: due,
          lawfulDueDate: due,
        },
      ];
    }

    const config = this.boundary.validateRecurrenceConfiguration(input.recurrenceConfiguration);
    const occurrences: GeneratedOccurrence[] = [];
    let occurrenceNumber = 0;
    let cursor = input.initialDueDate ?? input.startDate;
    const maxOccurrences = config.occurrences ?? 120;

    while (occurrenceNumber < maxOccurrences && cursor <= input.throughDate) {
      occurrenceNumber += 1;
      occurrences.push({
        occurrenceNumber,
        scheduledDueDate: new Date(cursor),
        lawfulDueDate: new Date(cursor),
      });
      cursor = this.nextDueDate(cursor, config);
    }

    return occurrences;
  }

  private nextDueDate(current: Date, config: ControlledRecurrenceConfiguration): Date {
    const next = new Date(current);
    switch (config.ruleType) {
      case 'ONE_TIME':
        return new Date(current.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        next.setUTCMonth(next.getUTCMonth() + 1);
        return next;
      case 'QUARTERLY':
        next.setUTCMonth(next.getUTCMonth() + 3);
        return next;
      case 'ANNUAL':
        next.setUTCFullYear(next.getUTCFullYear() + 1);
        return next;
      case 'BIENNIAL':
        next.setUTCFullYear(next.getUTCFullYear() + 2);
        return next;
      case 'CUSTOM_INTERVAL_DAYS':
        next.setUTCDate(next.getUTCDate() + (config.intervalDays ?? 1));
        return next;
      default:
        return next;
    }
  }
}
