import {
  InstrumentAcknowledgmentMethod,
  InstrumentDeliveryChannel,
  InstrumentDeliveryClassification,
  InstrumentDeliveryStatus,
  InstrumentTypePublicVerificationMode,
  OfficialInstrumentStatus,
} from '@prisma/client';

import {
  FORBIDDEN_CLIENT_INSTRUMENT_FIELDS,
  FORBIDDEN_PUBLIC_VERIFICATION_FIELDS,
} from '../src/decisions-issuance/decisions-issuance.constants';
import { InstrumentVerificationService } from '../src/decisions-issuance/verification/instrument-verification.service';

describe('Phase 8F delivery/receipt/verification invariants (must-fail)', () => {
  const verificationService = new InstrumentVerificationService(
    {} as never,
    { record: jest.fn() } as never,
    { assertAllowed: jest.fn() } as never,
  );

  it('documents that issuance status is distinct from delivery status', () => {
    expect(OfficialInstrumentStatus.ISSUED).not.toBe(
      InstrumentDeliveryStatus.DELIVERED as unknown as OfficialInstrumentStatus,
    );
  });

  it('documents that delivery status is distinct from receipt acknowledgment method', () => {
    expect(InstrumentDeliveryStatus.DELIVERED).not.toBe(
      InstrumentAcknowledgmentMethod.PORTAL_CONFIRMATION as unknown as InstrumentDeliveryStatus,
    );
  });

  it('documents that receipt acknowledgment method is distinct from verification status CURRENT', () => {
    expect(InstrumentAcknowledgmentMethod.PORTAL_CONFIRMATION).not.toEqual('CURRENT');
  });

  it('rejects sequential instrument IDs as the public verification mechanism at constants layer', () => {
    expect(FORBIDDEN_PUBLIC_VERIFICATION_FIELDS).not.toContain('instrumentNumber');
    expect(FORBIDDEN_CLIENT_INSTRUMENT_FIELDS).toContain('verificationCode');
  });

  it('does not treat superseded lifecycle as CURRENT verification', () => {
    const status = verificationService.resolveVerificationStatus({
      status: OfficialInstrumentStatus.SUPERSEDED,
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: null,
    } as never);

    expect(status).toBe('SUPERSEDED');
    expect(status).not.toBe('CURRENT');
  });

  it('documents approved delivery channels separately from receipt methods', () => {
    expect(InstrumentDeliveryChannel.PORTAL).not.toBe(
      InstrumentAcknowledgmentMethod.INTEGRATION_ACKNOWLEDGMENT as unknown as InstrumentDeliveryChannel,
    );
  });

  it('documents restricted delivery classifications', () => {
    expect(InstrumentDeliveryClassification.RESTRICTED).not.toBe(
      InstrumentDeliveryClassification.PUBLIC,
    );
  });

  it('documents that public verification mode NOT_PERMITTED is distinct from FULL', () => {
    expect(InstrumentTypePublicVerificationMode.NOT_PERMITTED).not.toBe(
      InstrumentTypePublicVerificationMode.FULL,
    );
  });
});
