import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_DELIVERY_EFFECTS,
  COMMUNICATION_DELIVERY_STATUSES,
  PHASE_11D_ENUM_NAMES,
  PHASE_11D_MODEL_NAMES,
} from './communications-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 11D communications schema', () => {
  for (const modelName of PHASE_11D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11D_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const channel of COMMUNICATION_CHANNELS) {
    it(`supports communication channel ${channel}`, () => {
      expect(schema).toContain(channel);
    });
  }

  for (const status of COMMUNICATION_DELIVERY_STATUSES) {
    it(`supports delivery status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const effect of COMMUNICATION_DELIVERY_EFFECTS) {
    it(`supports delivery effect ${effect}`, () => {
      expect(schema).toContain(effect);
    });
  }

  it('does not duplicate substantive notice models from earlier phases', () => {
    const messageBlock = /model CommunicationMessage \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(messageBlock).not.toContain('outcomeSummary');
    expect(messageBlock).not.toContain('reasonsSummary');
    expect(messageBlock).not.toContain('remedySummary');
    expect(schema.match(/model RedressNotice \{/g)).toHaveLength(1);
    expect(schema.match(/model DeficiencyNotice \{/g)).toHaveLength(1);
  });

  it('references canonical notices instead of duplicating substantive content', () => {
    const messageBlock = /model CommunicationMessage \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(messageBlock).toContain('canonicalNoticeReference');
    expect(messageBlock).toContain('sourceRecordType');
    expect(messageBlock).toContain('sourceRecordId');
    expect(messageBlock).not.toContain('outcomeSummary');
  });

  it('separates delivery attempts, deliveries, and receipts', () => {
    expect(schema).toContain('model CommunicationDelivery');
    expect(schema).toContain('model CommunicationDeliveryAttempt');
    expect(schema).toContain('model CommunicationReceipt');
  });

  it('indexes delivered communications into MAF section 15', () => {
    expect(schema).toContain('model CommunicationMafIndexEntry');
    expect(schema).toContain('deliveredVersionReference');
  });

  it('keeps active template versions immutable', () => {
    const versionBlock =
      /model CommunicationTemplateVersion \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(versionBlock).toContain('status');
    expect(versionBlock).toContain('activatedAt');
  });
});
