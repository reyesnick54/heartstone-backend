import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { CitizenExperienceModule } from './citizen-experience.module';

describe('S8 citizen experience consolidation', () => {
  it('does not keep a parallel root src/citizen-experience module tree', () => {
    expect(existsSync(join(process.cwd(), 'src/citizen-experience'))).toBe(false);
  });

  it('registers a single citizen experience Nest module under src/experience/citizen', () => {
    expect(CitizenExperienceModule).toBeDefined();
    expect(CitizenExperienceModule.name).toBe('CitizenExperienceModule');
  });
});
