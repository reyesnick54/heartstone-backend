import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INSPECTION_FINDING_SEVERITIES,
  INSPECTION_FINDING_STATUSES,
  INSPECTION_RESPONSE_TYPES,
  PHASE_9D_MODEL_NAMES,
} from './inspection-compliance-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Inspection compliance schema coherence (Phase 9D)', () => {
  for (const modelName of PHASE_9D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('extends InspectionRecord rather than replacing it', () => {
    expect(schema).toContain('model InspectionRecord');
    const recordBlock = extractModelBlock(schema, 'InspectionRecord');
    expect(recordBlock).toContain('session                   InspectionSession?');
  });

  it('links InspectionSession to canonical InspectionRecord', () => {
    const sessionBlock = extractModelBlock(schema, 'InspectionSession');
    expect(sessionBlock).toContain('inspectionRecordId');
    expect(sessionBlock).toContain('inspectionRecord                   InspectionRecord');
  });

  it('supports configurable finding severities without sanction fields', () => {
    for (const severity of INSPECTION_FINDING_SEVERITIES) {
      expect(schema).toContain(severity);
    }
    const findingBlock = extractModelBlock(schema, 'InspectionFinding');
    expect(findingBlock).not.toContain('sanction');
    expect(findingBlock).not.toContain('violationConfirmed');
  });

  it('supports finding statuses including disputed and superseded', () => {
    for (const status of INSPECTION_FINDING_STATUSES) {
      expect(schema).toContain(status);
    }
  });

  it('requires findings to link requirements through FindingRequirementLink', () => {
    const linkBlock = extractModelBlock(schema, 'FindingRequirementLink');
    expect(linkBlock).toContain('governingSourceId');
    expect(linkBlock).toContain('requirementReference');
  });

  it('preserves subject responses separately from findings and observations', () => {
    const responseBlock = extractModelBlock(schema, 'InspectionResponse');
    expect(responseBlock).toContain('inspectionFindingId');
    expect(responseBlock).toContain('inspectionObservationId');
    expect(responseBlock).not.toContain('overwrites');
  });

  it('records completion without automatic compliance certification', () => {
    const completionBlock = extractModelBlock(schema, 'InspectionCompletionRecord');
    expect(completionBlock).toContain('constitutesComplianceCertification');
    expect(completionBlock).toContain('@default(false)');
  });

  it('supports all inspection response types', () => {
    for (const responseType of INSPECTION_RESPONSE_TYPES) {
      expect(schema).toContain(responseType);
    }
  });
});
