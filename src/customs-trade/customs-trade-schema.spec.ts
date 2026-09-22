import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CUSTOMS_TRADE_FOUNDATION_ENUM_NAMES,
  CUSTOMS_TRADE_FOUNDATION_MODEL_NAMES,
} from './customs-trade-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Customs trade foundation schema', () => {
  for (const modelName of CUSTOMS_TRADE_FOUNDATION_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of CUSTOMS_TRADE_FOUNDATION_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links broker authorization to RepresentativeAuthority', () => {
    const block =
      /model CustomsBrokerAuthorization \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('representativeAuthorityId');
    expect(block).toContain('doesNotInferFromMembership');
  });

  it('keeps declaration submission distinct from cargo release', () => {
    const block = /model CustomsDeclaration \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('doesNotReleaseCargo');
  });

  it('stores declaration versions for amendments', () => {
    expect(schema).toContain('model CustomsDeclarationVersion');
    expect(schema).toContain('supersedesVersionId');
  });

  it('supports external commodity nomenclature without hard-coded tariff', () => {
    const block =
      /model CommodityClassificationReference \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('nomenclatureSystemCode');
    expect(block).toContain('aiSuggestionDoesNotAuthorize');
    expect(schema).toContain('AI_SUGGESTION');
  });

  it('integrates compliance inspections without equating to seizure', () => {
    const block = /model CustomsInspection \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('inspectionRecordId');
    expect(block).toContain('inspectionIsNotSeizure');
  });

  it('reuses revenue assessment reference optionally', () => {
    const block = /model CustomsAssessment \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('taxAssessmentId');
    expect(block).toContain('paymentAllocationId');
  });
});
