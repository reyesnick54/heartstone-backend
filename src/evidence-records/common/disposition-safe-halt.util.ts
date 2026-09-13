import {
  DispositionSafeHaltReason,
  type LegalHoldTargetType,
} from '@prisma/client';

export interface DispositionContext {
  targetType: LegalHoldTargetType;
  targetReference: string;
  retentionScheduleResolved: boolean;
  retentionPeriodResolved: boolean;
  classificationResolved: boolean;
  integrityVerified: boolean;
  appealActive: boolean;
  investigationActive: boolean;
  adverseEvidenceProtected: boolean;
  continuingObligation: boolean;
  archiveTransferComplete: boolean;
  legalHoldActive: boolean;
  vendorPolicyConflict: boolean;
  approvalPresent: boolean;
}

export function evaluateDispositionSafeHalts(
  context: DispositionContext,
): DispositionSafeHaltReason[] {
  const reasons: DispositionSafeHaltReason[] = [];

  if (context.legalHoldActive) {
    reasons.push(DispositionSafeHaltReason.LEGAL_HOLD_ACTIVE);
  }
  if (!context.retentionScheduleResolved) {
    reasons.push(DispositionSafeHaltReason.RETENTION_AUTHORITY_UNRESOLVED);
  }
  if (!context.retentionPeriodResolved) {
    reasons.push(DispositionSafeHaltReason.RETENTION_PERIOD_UNRESOLVED);
  }
  if (context.appealActive) {
    reasons.push(DispositionSafeHaltReason.APPEAL_ACTIVE);
  }
  if (context.investigationActive) {
    reasons.push(DispositionSafeHaltReason.INVESTIGATION_ACTIVE);
  }
  if (context.continuingObligation) {
    reasons.push(DispositionSafeHaltReason.CONTINUING_OBLIGATION);
  }
  if (!context.archiveTransferComplete) {
    reasons.push(DispositionSafeHaltReason.ARCHIVE_TRANSFER_INCOMPLETE);
  }
  if (!context.classificationResolved) {
    reasons.push(DispositionSafeHaltReason.CLASSIFICATION_UNRESOLVED);
  }
  if (!context.approvalPresent) {
    reasons.push(DispositionSafeHaltReason.REQUIRED_APPROVAL_MISSING);
  }
  if (!context.integrityVerified) {
    reasons.push(DispositionSafeHaltReason.INTEGRITY_CANNOT_BE_VERIFIED);
  }
  if (context.vendorPolicyConflict) {
    reasons.push(DispositionSafeHaltReason.VENDOR_POLICY_CONFLICT);
  }
  if (context.adverseEvidenceProtected) {
    reasons.push(DispositionSafeHaltReason.ADVERSE_EVIDENCE_PROTECTED);
  }

  return reasons;
}
