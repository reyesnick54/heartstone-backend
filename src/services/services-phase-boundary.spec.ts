import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PHASE_6_PLUS_MODELS = [
  'Application',
  'Case',
  'CaseWorkflow',
  'EvidencePacket',
  'GovernmentDecision',
  'IssuedLicense',
  'IssuedPermit',
  'PaymentTransaction',
  'InspectionCase',
] as const;

describe('Phase 5 services phase boundary', () => {
  const schemaPath = join(__dirname, '../../prisma/schema.prisma');
  const schema = readFileSync(schemaPath, 'utf8');

  for (const modelName of PHASE_6_PLUS_MODELS) {
    it(`prisma schema does not define Phase 6+ model ${modelName}`, () => {
      expect(schema).not.toMatch(new RegExp(`model\\s+${modelName}\\s*\\{`));
    });
  }
});
