import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Remediation S16 operational lifecycle schema', () => {
  const models = [
    'CaseManagerAssignment',
    'JointInspectionParticipant',
    'ComplianceCorrectiveActionRegister',
    'StrategicProjectCaseLink',
    'StrategicProjectInstitutionCoordination',
    'InstrumentRenewalMonitoringSchedule',
    'OperationalJobDefinition',
  ];

  for (const model of models) {
    it(`defines ${model}`, () => {
      expect(schema).toContain(`model ${model}`);
    });
  }

  it('extends inspection lifecycle statuses', () => {
    const block = /enum InspectionStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('FINDINGS_RECORDED');
    expect(block).toContain('FOLLOW_UP_REQUIRED');
  });

  it('records case manager audit event types', () => {
    expect(schema).toContain('CASE_MANAGER_ASSIGNED');
    expect(schema).toContain('CASE_MANAGER_REASSIGNED');
  });
});
