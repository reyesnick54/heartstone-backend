import { Injectable } from '@nestjs/common';

import { EDUCATION_BOUNDARY_DISCLAIMER, EDUCATION_RULE_ENVIRONMENT } from '../education.constants';

@Injectable()
export class EducationExperienceBoundaryService {
  readonly ruleEnvironment = EDUCATION_RULE_ENVIRONMENT;
  readonly disclaimer = EDUCATION_BOUNDARY_DISCLAIMER;
  readonly aiDisclaimer =
    'AI assistance may summarize education guidance but cannot grant admission, scholarships, accreditation, or licensure.';

  sanitizeCitizenPayload<T extends Record<string, unknown>>(payload: T): T {
    const clone = { ...payload } as Record<string, unknown>;
    for (const field of [
      'subjectIdentityId',
      'guardianIdentityId',
      'transcriptContent',
      'gradeDetails',
      'disciplinaryRecord',
    ]) {
      Reflect.deleteProperty(clone, field);
    }
    return clone as T;
  }
}
