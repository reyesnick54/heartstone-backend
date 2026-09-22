import { Injectable } from '@nestjs/common';

import {
  FORBIDDEN_CITIZEN_CLINICAL_NOTE_FIELDS,
  HEALTHCARE_EXPERIENCE_DISCLAIMER,
} from '../treatment.constants';

@Injectable()
export class TreatmentExperienceBoundaryService {
  readonly disclaimer = HEALTHCARE_EXPERIENCE_DISCLAIMER;

  sanitizeCitizenPayload<T extends Record<string, unknown>>(payload: T): T {
    const entries = Object.entries(payload).filter(
      ([key]) => !FORBIDDEN_CITIZEN_CLINICAL_NOTE_FIELDS.includes(key as never),
    );
    return Object.fromEntries(entries) as T;
  }

  separateTrialOpportunities<T extends { trialOpportunitySeparate?: boolean }>(
    items: T[],
  ): { programsAndTreatments: T[]; trialOpportunities: T[] } {
    const trialOpportunities = items.filter((item) => item.trialOpportunitySeparate === true);
    const programsAndTreatments = items.filter((item) => item.trialOpportunitySeparate !== true);
    return { programsAndTreatments, trialOpportunities };
  }
}
