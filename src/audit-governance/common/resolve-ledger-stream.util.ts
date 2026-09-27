import { AUDIT_LEDGER_STREAM } from '../audit-governance.constants';

export function resolveLedgerStreamKey(input: {
  institutionId?: string | null;
}): string {
  if (input.institutionId) {
    return AUDIT_LEDGER_STREAM.institution(input.institutionId);
  }

  return AUDIT_LEDGER_STREAM.platform;
}
