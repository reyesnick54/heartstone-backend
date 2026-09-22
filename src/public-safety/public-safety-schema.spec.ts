import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Public safety schema constants', () => {
  it('includes public safety models in prisma schema', () => {
    const schema = readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model PublicSafetyEngagement');
    expect(schema).toContain('model PublicSafetyOfficialNotice');
    expect(schema).toContain('enum PublicSafetyOfficialNoticeStatus');
  });
});
