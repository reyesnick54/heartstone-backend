import { EducationActorPersona } from '@prisma/client';

import { EDUCATION_INVARIANTS } from './education.constants';

describe('Education invariants', () => {
  it('documents core separation markers', () => {
    expect(EDUCATION_INVARIANTS.applicationNotEnrollment).toBe(true);
    expect(EDUCATION_INVARIANTS.studentRecordsNotPublicVerification).toBe(true);
  });

  it('lists AI and platform personas for boundary tests', () => {
    expect(EducationActorPersona.AI_ASSISTANCE).toBe('AI_ASSISTANCE');
    expect(EducationActorPersona.PLATFORM_ADMINISTRATOR).toBe('PLATFORM_ADMINISTRATOR');
  });
});
