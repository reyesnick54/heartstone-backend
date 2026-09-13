import { formatInstrumentNumber } from './instrument-number.util';

describe('formatInstrumentNumber', () => {
  it('formats institution-defined patterns without hard-coded national formats', () => {
    const result = formatInstrumentNumber('{INST}-{YEAR}-{SEQ:4}', {
      institutionCode: 'ABSEZ-LIC',
      year: 2026,
      sequence: 42,
    });

    expect(result).toBe('ABSEZ-LIC-2026-0042');
  });
});
