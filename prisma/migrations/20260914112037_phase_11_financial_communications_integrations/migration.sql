/*
  Warnings:

  - The `priorStatus` column on the `instrument_lifecycle_events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `compliance_assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `compliance_escalations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `compliance_finding_closures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `compliance_finding_reopenings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrective_action_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrective_action_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrective_action_submission_evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrective_action_submissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrective_action_verification_evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrective_action_verifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emergency_interim_action_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `enforcement_referrals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finding_requirement_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_completion_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_finding_evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_findings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_observation_evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_observations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_response_evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_responses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_schedule_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspection_type_definitions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inspector_qualification_snapshots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `instrument_controlling_decisions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lifecycle_official_instrument_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lifecycle_official_instruments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `noncompliance_findings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `protective_action_recommendations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reinspection_requirements` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `newStatus` on the `instrument_lifecycle_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ComplianceRiskScorePurpose" AS ENUM ('PRIORITIZATION_ONLY');

-- CreateEnum
CREATE TYPE "FeeScheduleStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "FeeAssessmentStatus" AS ENUM ('CALCULATED', 'INVOICED', 'WAIVED', 'ADJUSTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "FinancialApprovalType" AS ENUM ('FEE_SCHEDULE_ACTIVATION', 'FEE_WAIVER', 'FEE_ADJUSTMENT', 'REFUND_AUTHORIZATION', 'RECONCILIATION_CLOSURE', 'ARREARS_ACTION');

-- CreateEnum
CREATE TYPE "FinancialApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "FeeAdjustmentDecisionOutcome" AS ENUM ('APPROVED', 'PARTIALLY_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentChannelType" AS ENUM ('CARD', 'BANK_TRANSFER', 'CASH_COUNTER', 'GOVERNMENT_TREASURY', 'MOBILE_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'SETTLED', 'FAILED', 'REVERSED', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "PaymentWebhookProcessingStatus" AS ENUM ('RECEIVED', 'AUTHENTICATED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "FeeAdjustmentRequestStatus" AS ENUM ('PENDING', 'DECIDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationBatchStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'EXCEPTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReconciliationItemStatus" AS ENUM ('MATCHED', 'MISMATCH', 'EXCEPTION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FinancialDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ArrearsRecordStatus" AS ENUM ('OUTSTANDING', 'PARTIALLY_PAID', 'PAID', 'WRITTEN_OFF', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CommunicationTemplateStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "CommunicationChannelType" AS ENUM ('EMAIL', 'SMS', 'PORTAL', 'POSTAL', 'IN_PERSON', 'GOVERNMENT_SECURE_MESSAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationMessageStatus" AS ENUM ('DRAFT', 'APPROVED', 'QUEUED', 'DELIVERING', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationDeliveryStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'FAILED', 'BOUNCED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CommunicationReceiptType" AS ENUM ('DELIVERY_CONFIRMATION', 'READ_RECEIPT', 'LEGAL_ACKNOWLEDGMENT', 'SIGNATURE_CAPTURE');

-- CreateEnum
CREATE TYPE "MandatoryCommunicationRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "IntegrationAcceptanceStatus" AS ENUM ('TECHNICALLY_CONNECTED', 'TESTED', 'TECHNICALLY_READY', 'INSTITUTIONALLY_ACCEPTED', 'OPERATIONALLY_ACTIVE', 'SUSPENDED', 'REVALIDATION_REQUIRED');

-- CreateEnum
CREATE TYPE "IntegrationDefinitionStatus" AS ENUM ('DRAFT', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "IntegrationEndpointDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "DataExchangeFieldDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "AuthoritativeSourceStatus" AS ENUM ('AUTHORITATIVE', 'SUPPORTING', 'MODELED', 'UNVERIFIED', 'STALE');

-- CreateEnum
CREATE TYPE "IntegrationRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SAFE_HALTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationExchangeStatus" AS ENUM ('INITIATED', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'FAILED', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "IntegrationMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "IntegrationWebhookProcessingStatus" AS ENUM ('RECEIVED', 'AUTHENTICATED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceDiscrepancyStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "IntegrationOutageStatus" AS ENUM ('DETECTED', 'CONFIRMED', 'RECOVERING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IntegrationFallbackStatus" AS ENUM ('ACTIVATED', 'IN_USE', 'RECONCILING', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "IntegrationReconciliationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'EXCEPTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "RegistryQueryStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "RegistrySynchronizationResult" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- DropForeignKey
ALTER TABLE "_PacketItemAcceptances" DROP CONSTRAINT "_PacketItemAcceptances_A_fkey";

-- DropForeignKey
ALTER TABLE "_PacketItemAcceptances" DROP CONSTRAINT "_PacketItemAcceptances_B_fkey";

-- DropForeignKey
ALTER TABLE "compliance_assessments" DROP CONSTRAINT "compliance_assessments_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_assessments" DROP CONSTRAINT "compliance_assessments_caseId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_assessments" DROP CONSTRAINT "compliance_assessments_evidencePacketId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_assessments" DROP CONSTRAINT "compliance_assessments_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_assessments" DROP CONSTRAINT "compliance_assessments_reviewerIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_assessments" DROP CONSTRAINT "compliance_assessments_reviewerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_caseId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_complianceAssessmentId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_escalatedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_escalatedByOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_noncomplianceFindingId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_escalations" DROP CONSTRAINT "compliance_escalations_phase8InstrumentId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_finding_closures" DROP CONSTRAINT "compliance_finding_closures_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_finding_closures" DROP CONSTRAINT "compliance_finding_closures_reviewerIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_finding_closures" DROP CONSTRAINT "compliance_finding_closures_reviewerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_finding_reopenings" DROP CONSTRAINT "compliance_finding_reopenings_priorClosureId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_finding_reopenings" DROP CONSTRAINT "compliance_finding_reopenings_reviewerIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "compliance_finding_reopenings" DROP CONSTRAINT "compliance_finding_reopenings_reviewerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_items" DROP CONSTRAINT "corrective_action_items_correctiveActionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_plans" DROP CONSTRAINT "corrective_action_plans_approvedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_plans" DROP CONSTRAINT "corrective_action_plans_approvedByOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_plans" DROP CONSTRAINT "corrective_action_plans_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_submission_evidence" DROP CONSTRAINT "corrective_action_submission_evidence_evidenceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_submission_evidence" DROP CONSTRAINT "corrective_action_submission_evidence_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_submissions" DROP CONSTRAINT "corrective_action_submissions_correctiveActionItemId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_submissions" DROP CONSTRAINT "corrective_action_submissions_correctiveActionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_submissions" DROP CONSTRAINT "corrective_action_submissions_submittedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verification_evidence" DROP CONSTRAINT "corrective_action_verification_evidence_evidenceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verification_evidence" DROP CONSTRAINT "corrective_action_verification_evidence_verificationId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verifications" DROP CONSTRAINT "corrective_action_verifications_authorityEvaluationRecordI_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verifications" DROP CONSTRAINT "corrective_action_verifications_correctiveActionItemId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verifications" DROP CONSTRAINT "corrective_action_verifications_correctiveActionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verifications" DROP CONSTRAINT "corrective_action_verifications_verifierIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "corrective_action_verifications" DROP CONSTRAINT "corrective_action_verifications_verifierOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "decision_review_references" DROP CONSTRAINT "decision_review_references_challengedDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "decision_review_references" DROP CONSTRAINT "decision_review_references_challengedInstrumentId_fkey";

-- DropForeignKey
ALTER TABLE "emergency_interim_action_records" DROP CONSTRAINT "emergency_interim_action_records_actorIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "emergency_interim_action_records" DROP CONSTRAINT "emergency_interim_action_records_actorOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "emergency_interim_action_records" DROP CONSTRAINT "emergency_interim_action_records_authorityEvaluationRecordId_fk";

-- DropForeignKey
ALTER TABLE "emergency_interim_action_records" DROP CONSTRAINT "emergency_interim_action_records_caseId_fkey";

-- DropForeignKey
ALTER TABLE "emergency_interim_action_records" DROP CONSTRAINT "emergency_interim_action_records_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "enforcement_referrals" DROP CONSTRAINT "enforcement_referrals_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "enforcement_referrals" DROP CONSTRAINT "enforcement_referrals_caseId_fkey";

-- DropForeignKey
ALTER TABLE "enforcement_referrals" DROP CONSTRAINT "enforcement_referrals_evidencePacketId_fkey";

-- DropForeignKey
ALTER TABLE "enforcement_referrals" DROP CONSTRAINT "enforcement_referrals_externalAuthorityId_fkey";

-- DropForeignKey
ALTER TABLE "enforcement_referrals" DROP CONSTRAINT "enforcement_referrals_referredByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "enforcement_referrals" DROP CONSTRAINT "enforcement_referrals_referredByOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "finding_requirement_links" DROP CONSTRAINT "finding_requirement_links_governingSourceId_fkey";

-- DropForeignKey
ALTER TABLE "finding_requirement_links" DROP CONSTRAINT "finding_requirement_links_inspectionFindingId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_caseId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_decisionReadinessAssessmentId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_decisionTypeVersionId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_evidencePacketVersionId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_masterAdministrativeFileId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_assignments" DROP CONSTRAINT "inspection_assignments_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_assignments" DROP CONSTRAINT "inspection_assignments_inspectionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_assignments" DROP CONSTRAINT "inspection_assignments_inspectorIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_assignments" DROP CONSTRAINT "inspection_assignments_jurisdictionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_assignments" DROP CONSTRAINT "inspection_assignments_officeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_completion_records" DROP CONSTRAINT "inspection_completion_records_complianceCertificationAuthorityE";

-- DropForeignKey
ALTER TABLE "inspection_completion_records" DROP CONSTRAINT "inspection_completion_records_inspectionSessionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_completion_records" DROP CONSTRAINT "inspection_completion_records_inspectorIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_completion_records" DROP CONSTRAINT "inspection_completion_records_inspectorOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_completion_records" DROP CONSTRAINT "inspection_completion_records_reviewerIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_completion_records" DROP CONSTRAINT "inspection_completion_records_reviewerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_finding_evidence" DROP CONSTRAINT "inspection_finding_evidence_evidenceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_finding_evidence" DROP CONSTRAINT "inspection_finding_evidence_inspectionFindingId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_confirmationAuthorityEvaluationRecordId_fke";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_inspectionSessionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_inspectorIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_inspectorOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_reviewerIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_reviewerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_supersededById_fkey";

-- DropForeignKey
ALTER TABLE "inspection_observation_evidence" DROP CONSTRAINT "inspection_observation_evidence_evidenceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_observation_evidence" DROP CONSTRAINT "inspection_observation_evidence_inspectionObservationId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_observations" DROP CONSTRAINT "inspection_observations_inspectionSessionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_observations" DROP CONSTRAINT "inspection_observations_inspectorIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_observations" DROP CONSTRAINT "inspection_observations_inspectorOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_approvedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_authorizedConditionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_complianceMatterId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_createdByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_inspectionTypeDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_plans" DROP CONSTRAINT "inspection_plans_jurisdictionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_response_evidence" DROP CONSTRAINT "inspection_response_evidence_evidenceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_response_evidence" DROP CONSTRAINT "inspection_response_evidence_inspectionResponseId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_responses" DROP CONSTRAINT "inspection_responses_inspectionFindingId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_responses" DROP CONSTRAINT "inspection_responses_inspectionObservationId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_responses" DROP CONSTRAINT "inspection_responses_inspectionSessionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_responses" DROP CONSTRAINT "inspection_responses_responderIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_schedule_events" DROP CONSTRAINT "inspection_schedule_events_inspectionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_schedule_events" DROP CONSTRAINT "inspection_schedule_events_recordedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_sessions" DROP CONSTRAINT "inspection_sessions_caseAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_sessions" DROP CONSTRAINT "inspection_sessions_inspectionRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_sessions" DROP CONSTRAINT "inspection_sessions_jurisdictionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_sessions" DROP CONSTRAINT "inspection_sessions_scopeAmendmentApprovedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_sessions" DROP CONSTRAINT "inspection_sessions_scopeAmendmentApprovedByOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_sessions" DROP CONSTRAINT "inspection_sessions_startAuthorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_type_definitions" DROP CONSTRAINT "inspection_type_definitions_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_type_definitions" DROP CONSTRAINT "inspection_type_definitions_jurisdictionId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_type_definitions" DROP CONSTRAINT "inspection_type_definitions_responsibleDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "inspection_type_definitions" DROP CONSTRAINT "inspection_type_definitions_responsibleInstitutionId_fkey";

-- DropForeignKey
ALTER TABLE "inspector_qualification_snapshots" DROP CONSTRAINT "inspector_qualification_snapshots_inspectionAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "inspector_qualification_snapshots" DROP CONSTRAINT "inspector_qualification_snapshots_verifiedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_amendment_records" DROP CONSTRAINT "instrument_amendment_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_amendment_records" DROP CONSTRAINT "instrument_amendment_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_amendment_records" DROP CONSTRAINT "instrument_amendment_records_newVersionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_amendment_records" DROP CONSTRAINT "instrument_amendment_records_priorVersionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_authorityEvaluationRecord_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_caseId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_decidingIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_decidingOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_governmentServiceVersionI_fkey";

-- DropForeignKey
ALTER TABLE "instrument_controlling_decisions" DROP CONSTRAINT "instrument_controlling_decisions_masterAdministrativeFileI_fkey";

-- DropForeignKey
ALTER TABLE "instrument_lifecycle_decision_links" DROP CONSTRAINT "instrument_lifecycle_decision_links_governmentDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_lifecycle_events" DROP CONSTRAINT "instrument_lifecycle_events_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_lifecycle_events" DROP CONSTRAINT "instrument_lifecycle_events_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_reinstatement_records" DROP CONSTRAINT "instrument_reinstatement_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_reinstatement_records" DROP CONSTRAINT "instrument_reinstatement_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_renewal_records" DROP CONSTRAINT "instrument_renewal_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_renewal_records" DROP CONSTRAINT "instrument_renewal_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_renewal_records" DROP CONSTRAINT "instrument_renewal_records_newVersionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_renewal_records" DROP CONSTRAINT "instrument_renewal_records_priorVersionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_replacement_records" DROP CONSTRAINT "instrument_replacement_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_replacement_records" DROP CONSTRAINT "instrument_replacement_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_replacement_records" DROP CONSTRAINT "instrument_replacement_records_priorVersionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_replacement_records" DROP CONSTRAINT "instrument_replacement_records_replacementVersionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_revocation_records" DROP CONSTRAINT "instrument_revocation_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_revocation_records" DROP CONSTRAINT "instrument_revocation_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_surrender_records" DROP CONSTRAINT "instrument_surrender_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_surrender_records" DROP CONSTRAINT "instrument_surrender_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_suspension_records" DROP CONSTRAINT "instrument_suspension_records_controllingDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "instrument_suspension_records" DROP CONSTRAINT "instrument_suspension_records_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instrument_versions" DROP CONSTRAINT "lifecycle_official_instrument_versions_createdByDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instrument_versions" DROP CONSTRAINT "lifecycle_official_instrument_versions_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instrument_versions" DROP CONSTRAINT "lifecycle_official_instrument_versions_supersededByVersion_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_caseId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_governmentServiceVersionId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_holderIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_holderOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_issuingInstitutionId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_masterAdministrativeFileId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycle_official_instruments" DROP CONSTRAINT "lifecycle_official_instruments_originalDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_caseId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_complianceAssessmentId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_confirmedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_confirmedByOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_evidencePacketId_fkey";

-- DropForeignKey
ALTER TABLE "noncompliance_findings" DROP CONSTRAINT "noncompliance_findings_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "official_instrument_versions" DROP CONSTRAINT "official_instrument_versions_templateVersionId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_caseId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_instrumentTypeVersionId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_issuerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_masterAdministrativeFileId_fkey";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_authorityEvaluationRecordId_f";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_caseId_fkey";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_complianceAssessmentId_fkey";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_noncomplianceFindingId_fkey";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_phase8InstrumentId_fkey";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_recommendedByIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "protective_action_recommendations" DROP CONSTRAINT "protective_action_recommendations_recommendedByOfficeholderId_f";

-- DropForeignKey
ALTER TABLE "reinspection_requirements" DROP CONSTRAINT "reinspection_requirements_completedInspectionRecordId_fkey";

-- DropForeignKey
ALTER TABLE "reinspection_requirements" DROP CONSTRAINT "reinspection_requirements_scheduledInspectionRecordId_fkey";

-- DropForeignKey
ALTER TABLE "reinspection_requirements" DROP CONSTRAINT "reinspection_requirements_waivedByOfficeholderId_fkey";

-- AlterTable
ALTER TABLE "case_communications" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "case_milestones" ALTER COLUMN "reachedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "case_public_status_projections" ALTER COLUMN "publicStatusLabel" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "government_decisions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "instrument_lifecycle_events" DROP COLUMN "priorStatus",
ADD COLUMN     "priorStatus" "OfficialInstrumentStatus",
DROP COLUMN "newStatus",
ADD COLUMN     "newStatus" "OfficialInstrumentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "official_instruments" ALTER COLUMN "scope" DROP DEFAULT;

-- DropTable
DROP TABLE "compliance_assessments";

-- DropTable
DROP TABLE "compliance_escalations";

-- DropTable
DROP TABLE "compliance_finding_closures";

-- DropTable
DROP TABLE "compliance_finding_reopenings";

-- DropTable
DROP TABLE "corrective_action_items";

-- DropTable
DROP TABLE "corrective_action_plans";

-- DropTable
DROP TABLE "corrective_action_submission_evidence";

-- DropTable
DROP TABLE "corrective_action_submissions";

-- DropTable
DROP TABLE "corrective_action_verification_evidence";

-- DropTable
DROP TABLE "corrective_action_verifications";

-- DropTable
DROP TABLE "emergency_interim_action_records";

-- DropTable
DROP TABLE "enforcement_referrals";

-- DropTable
DROP TABLE "finding_requirement_links";

-- DropTable
DROP TABLE "inspection_assignments";

-- DropTable
DROP TABLE "inspection_completion_records";

-- DropTable
DROP TABLE "inspection_finding_evidence";

-- DropTable
DROP TABLE "inspection_findings";

-- DropTable
DROP TABLE "inspection_observation_evidence";

-- DropTable
DROP TABLE "inspection_observations";

-- DropTable
DROP TABLE "inspection_plans";

-- DropTable
DROP TABLE "inspection_response_evidence";

-- DropTable
DROP TABLE "inspection_responses";

-- DropTable
DROP TABLE "inspection_schedule_events";

-- DropTable
DROP TABLE "inspection_sessions";

-- DropTable
DROP TABLE "inspection_type_definitions";

-- DropTable
DROP TABLE "inspector_qualification_snapshots";

-- DropTable
DROP TABLE "instrument_controlling_decisions";

-- DropTable
DROP TABLE "lifecycle_official_instrument_versions";

-- DropTable
DROP TABLE "lifecycle_official_instruments";

-- DropTable
DROP TABLE "noncompliance_findings";

-- DropTable
DROP TABLE "protective_action_recommendations";

-- DropTable
DROP TABLE "reinspection_requirements";

-- DropEnum
DROP TYPE "ComplianceAssessmentStatus";

-- DropEnum
DROP TYPE "ComplianceEscalationStatus";

-- DropEnum
DROP TYPE "ComplianceEscalationType";

-- DropEnum
DROP TYPE "ComplianceFindingClosureStatus";

-- DropEnum
DROP TYPE "ComplianceFindingReopeningReason";

-- DropEnum
DROP TYPE "ComplianceImmediateActionRoute";

-- DropEnum
DROP TYPE "ComplianceRecommendedNextStep";

-- DropEnum
DROP TYPE "ComplianceRiskLevel";

-- DropEnum
DROP TYPE "CorrectiveActionItemStatus";

-- DropEnum
DROP TYPE "CorrectiveActionPlanStatus";

-- DropEnum
DROP TYPE "CorrectiveActionSubmissionStatus";

-- DropEnum
DROP TYPE "CorrectiveActionVerificationResult";

-- DropEnum
DROP TYPE "EmergencyInterimActionStatus";

-- DropEnum
DROP TYPE "EnforcementReferralStatus";

-- DropEnum
DROP TYPE "InspectionAssignmentStatus";

-- DropEnum
DROP TYPE "InspectionFindingSeverity";

-- DropEnum
DROP TYPE "InspectionFindingStatus";

-- DropEnum
DROP TYPE "InspectionNoticeStatus";

-- DropEnum
DROP TYPE "InspectionPlanStatus";

-- DropEnum
DROP TYPE "InspectionPlanTriggerType";

-- DropEnum
DROP TYPE "InspectionResponseType";

-- DropEnum
DROP TYPE "InspectionScheduleEventType";

-- DropEnum
DROP TYPE "InspectionSessionStatus";

-- DropEnum
DROP TYPE "InspectionTypeDefinitionStatus";

-- DropEnum
DROP TYPE "InspectorIndependenceStatus";

-- DropEnum
DROP TYPE "InstrumentControllingDecisionStatus";

-- DropEnum
DROP TYPE "InstrumentControllingDecisionType";

-- DropEnum
DROP TYPE "LifecycleOfficialInstrumentStatus";

-- DropEnum
DROP TYPE "LifecycleOfficialInstrumentType";

-- DropEnum
DROP TYPE "NoncomplianceFindingStatus";

-- DropEnum
DROP TYPE "NoncomplianceMateriality";

-- DropEnum
DROP TYPE "NoncomplianceRepetition";

-- DropEnum
DROP TYPE "NoncomplianceSeverity";

-- DropEnum
DROP TYPE "ProtectiveActionRecommendationStatus";

-- DropEnum
DROP TYPE "ProtectiveActionRecommendationType";

-- DropEnum
DROP TYPE "ReinspectionRequirementStatus";

-- DropEnum
DROP TYPE "RetainedEnforcementAuthorityClass";

-- DropEnum
DROP TYPE "RootCauseAnalysisMethod";

-- CreateTable
CREATE TABLE "fee_schedules" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "governmentServiceId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FeeScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_schedule_versions" (
    "id" UUID NOT NULL,
    "feeScheduleId" UUID NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "status" "FeeScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "changeSummary" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByIdentityId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_schedule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_schedule_items" (
    "id" UUID NOT NULL,
    "feeScheduleVersionId" UUID NOT NULL,
    "itemCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "isVariable" BOOLEAN NOT NULL DEFAULT false,
    "calculationFormula" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_assessments" (
    "id" UUID NOT NULL,
    "caseId" UUID,
    "applicationId" UUID,
    "feeScheduleVersionId" UUID NOT NULL,
    "masterAdministrativeFileId" UUID,
    "assessmentReference" TEXT NOT NULL,
    "status" "FeeAssessmentStatus" NOT NULL DEFAULT 'CALCULATED',
    "totalAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "feeAssessmentId" UUID NOT NULL,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmountCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "feeScheduleItemId" UUID,
    "lineCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountCents" INTEGER NOT NULL,
    "lineAmountCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_channel_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" "PaymentChannelType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "configurationSchema" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_channel_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_configurations" (
    "id" UUID NOT NULL,
    "paymentChannelDefinitionId" UUID NOT NULL,
    "institutionId" UUID,
    "providerCode" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "intentReference" TEXT NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "paymentIntentId" UUID NOT NULL,
    "paymentProviderConfigurationId" UUID NOT NULL,
    "providerTransactionReference" TEXT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "authorizedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "invoiceLineId" UUID,
    "allocatedAmountCents" INTEGER NOT NULL,
    "allocationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_webhook_events" (
    "id" UUID NOT NULL,
    "paymentProviderConfigurationId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processingStatus" "PaymentWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_adjustment_requests" (
    "id" UUID NOT NULL,
    "feeAssessmentId" UUID NOT NULL,
    "requestedAmountCents" INTEGER NOT NULL,
    "requestedByIdentityId" UUID,
    "reason" TEXT NOT NULL,
    "status" "FeeAdjustmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_adjustment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_adjustment_decisions" (
    "id" UUID NOT NULL,
    "feeAdjustmentRequestId" UUID NOT NULL,
    "decidedByIdentityId" UUID,
    "outcome" "FeeAdjustmentDecisionOutcome" NOT NULL,
    "adjustedAmountCents" INTEGER,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_adjustment_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "redressImplementationActionId" UUID,
    "requestedAmountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_authorizations" (
    "id" UUID NOT NULL,
    "refundRequestId" UUID NOT NULL,
    "authorizedByIdentityId" UUID,
    "authorizedAmountCents" INTEGER NOT NULL,
    "authorizationReference" TEXT NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_transactions" (
    "id" UUID NOT NULL,
    "refundRequestId" UUID NOT NULL,
    "refundAuthorizationId" UUID,
    "providerRefundReference" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "RefundTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_batches" (
    "id" UUID NOT NULL,
    "institutionId" UUID,
    "batchReference" TEXT NOT NULL,
    "status" "ReconciliationBatchStatus" NOT NULL DEFAULT 'OPEN',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_items" (
    "id" UUID NOT NULL,
    "reconciliationBatchId" UUID NOT NULL,
    "paymentTransactionId" UUID,
    "externalReference" TEXT,
    "expectedAmountCents" INTEGER NOT NULL,
    "actualAmountCents" INTEGER,
    "status" "ReconciliationItemStatus" NOT NULL DEFAULT 'MISMATCH',
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_disputes" (
    "id" UUID NOT NULL,
    "invoiceId" UUID,
    "paymentTransactionId" UUID,
    "disputeReference" TEXT NOT NULL,
    "status" "FinancialDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrears_records" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "outstandingAmountCents" INTEGER NOT NULL,
    "status" "ArrearsRecordStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "writtenOffAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrears_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_approval_records" (
    "id" UUID NOT NULL,
    "approvalType" "FinancialApprovalType" NOT NULL,
    "status" "FinancialApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "subjectReference" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "approvedByIdentityId" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "feeScheduleVersionId" UUID,
    "refundAuthorizationId" UUID,
    "reconciliationBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_approval_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" "CommunicationChannelType" NOT NULL,
    "institutionId" UUID,
    "status" "CommunicationTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_template_versions" (
    "id" UUID NOT NULL,
    "communicationTemplateId" UUID NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "subjectTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "CommunicationTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" UUID NOT NULL,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "communicationTemplateVersionId" UUID,
    "decisionNoticeReference" TEXT,
    "messageReference" TEXT NOT NULL,
    "channelType" "CommunicationChannelType" NOT NULL,
    "status" "CommunicationMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_recipients" (
    "id" UUID NOT NULL,
    "communicationMessageId" UUID NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientReference" TEXT NOT NULL,
    "recipientIdentityId" UUID,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_deliveries" (
    "id" UUID NOT NULL,
    "communicationMessageId" UUID NOT NULL,
    "communicationRecipientId" UUID,
    "channelType" "CommunicationChannelType" NOT NULL,
    "status" "CommunicationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_delivery_attempts" (
    "id" UUID NOT NULL,
    "communicationDeliveryId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "CommunicationDeliveryStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerReference" TEXT,
    "failureReason" TEXT,
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_receipts" (
    "id" UUID NOT NULL,
    "communicationDeliveryId" UUID NOT NULL,
    "receiptType" "CommunicationReceiptType" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" UUID NOT NULL,
    "identityId" UUID,
    "institutionId" UUID,
    "channelType" "CommunicationChannelType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "locale" TEXT,
    "accessibilityRequirements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandatory_communication_rules" (
    "id" UUID NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "institutionId" UUID,
    "governmentServiceId" UUID,
    "triggerEvent" TEXT NOT NULL,
    "channelType" "CommunicationChannelType" NOT NULL,
    "templateReference" TEXT NOT NULL,
    "status" "MandatoryCommunicationRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandatory_communication_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_records" (
    "id" UUID NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "sourceLocale" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "translatedContent" TEXT NOT NULL,
    "translatorIdentityId" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessibility_accommodations" (
    "id" UUID NOT NULL,
    "identityId" UUID,
    "accommodationType" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessibility_accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_dependencies" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vendorReference" TEXT,
    "criticalityLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technology_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_definitions" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "technologyDependencyId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "IntegrationDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_versions" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "specificationReference" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_endpoints" (
    "id" UUID NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "endpointCode" TEXT NOT NULL,
    "direction" "IntegrationEndpointDirection" NOT NULL,
    "urlTemplate" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "authenticationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_exchange_contracts" (
    "id" UUID NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "contractCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_exchange_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_exchange_fields" (
    "id" UUID NOT NULL,
    "dataExchangeContractId" UUID NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "direction" "DataExchangeFieldDirection" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "transformationRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_exchange_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authoritative_source_designations" (
    "id" UUID NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "institutionId" UUID,
    "status" "AuthoritativeSourceStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "designatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authoritative_source_designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_authority_mappings" (
    "id" UUID NOT NULL,
    "dataExchangeFieldId" UUID NOT NULL,
    "authoritativeSourceDesignationId" UUID NOT NULL,
    "mappingRule" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_authority_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_credential_references" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "credentialAlias" TEXT NOT NULL,
    "vaultReference" TEXT NOT NULL,
    "rotatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credential_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_acceptance_records" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "acceptanceStatus" "IntegrationAcceptanceStatus" NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedByIdentityId" UUID,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_acceptance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_requests" (
    "id" UUID NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "masterAdministrativeFileId" UUID,
    "caseId" UUID,
    "requestReference" TEXT NOT NULL,
    "status" "IntegrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_exchanges" (
    "id" UUID NOT NULL,
    "integrationRequestId" UUID NOT NULL,
    "status" "IntegrationExchangeStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_messages" (
    "id" UUID NOT NULL,
    "integrationExchangeId" UUID NOT NULL,
    "integrationEndpointId" UUID,
    "direction" "IntegrationMessageDirection" NOT NULL,
    "messageType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_webhook_events" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processingStatus" "IntegrationWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_data_transformations" (
    "id" UUID NOT NULL,
    "integrationMessageId" UUID NOT NULL,
    "transformationType" TEXT NOT NULL,
    "inputReference" TEXT NOT NULL,
    "outputReference" TEXT NOT NULL,
    "transformedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_data_transformations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_validation_results" (
    "id" UUID NOT NULL,
    "integrationExchangeId" UUID NOT NULL,
    "validationType" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "errors" JSONB,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_validation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_record_references" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "externalSystemCode" TEXT NOT NULL,
    "externalRecordId" TEXT NOT NULL,
    "localReferenceType" TEXT NOT NULL,
    "localReferenceId" UUID NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_record_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registry_queries" (
    "id" UUID NOT NULL,
    "externalRecordReferenceId" UUID,
    "integrationDefinitionId" UUID NOT NULL,
    "queryReference" TEXT NOT NULL,
    "status" "RegistryQueryStatus" NOT NULL DEFAULT 'PENDING',
    "queriedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registry_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registry_synchronizations" (
    "id" UUID NOT NULL,
    "registryQueryId" UUID NOT NULL,
    "syncDirection" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncResult" "RegistrySynchronizationResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registry_synchronizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_discrepancies" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "fieldReference" TEXT NOT NULL,
    "localValue" TEXT,
    "externalValue" TEXT,
    "status" "SourceDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_discrepancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_discrepancy_resolutions" (
    "id" UUID NOT NULL,
    "sourceDiscrepancyId" UUID NOT NULL,
    "resolutionAction" TEXT NOT NULL,
    "resolvedByIdentityId" UUID,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_discrepancy_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_reconciliation_records" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "reconciliationReference" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "IntegrationReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_reconciliation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_dead_letter_records" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "integrationMessageId" UUID,
    "originalPayload" JSONB NOT NULL,
    "failureReason" TEXT NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retriedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_dead_letter_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_outages" (
    "id" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "status" "IntegrationOutageStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "impactSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_outages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_fallback_activations" (
    "id" UUID NOT NULL,
    "integrationOutageId" UUID NOT NULL,
    "integrationDefinitionId" UUID NOT NULL,
    "status" "IntegrationFallbackStatus" NOT NULL DEFAULT 'ACTIVATED',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "fallbackMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_fallback_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_recovery_events" (
    "id" UUID NOT NULL,
    "integrationOutageId" UUID NOT NULL,
    "recoveryAction" TEXT NOT NULL,
    "recoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedByIdentityId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_recovery_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_schedules_institutionId_idx" ON "fee_schedules"("institutionId");

-- CreateIndex
CREATE INDEX "fee_schedules_governmentServiceId_idx" ON "fee_schedules"("governmentServiceId");

-- CreateIndex
CREATE INDEX "fee_schedules_status_idx" ON "fee_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_schedules_institutionId_code_key" ON "fee_schedules"("institutionId", "code");

-- CreateIndex
CREATE INDEX "fee_schedule_versions_feeScheduleId_idx" ON "fee_schedule_versions"("feeScheduleId");

-- CreateIndex
CREATE INDEX "fee_schedule_versions_status_idx" ON "fee_schedule_versions"("status");

-- CreateIndex
CREATE INDEX "fee_schedule_versions_approvedByIdentityId_idx" ON "fee_schedule_versions"("approvedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_schedule_versions_feeScheduleId_versionNumber_key" ON "fee_schedule_versions"("feeScheduleId", "versionNumber");

-- CreateIndex
CREATE INDEX "fee_schedule_items_feeScheduleVersionId_idx" ON "fee_schedule_items"("feeScheduleVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_schedule_items_feeScheduleVersionId_itemCode_key" ON "fee_schedule_items"("feeScheduleVersionId", "itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "fee_assessments_assessmentReference_key" ON "fee_assessments"("assessmentReference");

-- CreateIndex
CREATE INDEX "fee_assessments_caseId_idx" ON "fee_assessments"("caseId");

-- CreateIndex
CREATE INDEX "fee_assessments_applicationId_idx" ON "fee_assessments"("applicationId");

-- CreateIndex
CREATE INDEX "fee_assessments_feeScheduleVersionId_idx" ON "fee_assessments"("feeScheduleVersionId");

-- CreateIndex
CREATE INDEX "fee_assessments_masterAdministrativeFileId_idx" ON "fee_assessments"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "fee_assessments_status_idx" ON "fee_assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_feeAssessmentId_idx" ON "invoices"("feeAssessmentId");

-- CreateIndex
CREATE INDEX "invoices_caseId_idx" ON "invoices"("caseId");

-- CreateIndex
CREATE INDEX "invoices_masterAdministrativeFileId_idx" ON "invoices"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_lines_feeScheduleItemId_idx" ON "invoice_lines"("feeScheduleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_channel_definitions_code_key" ON "payment_channel_definitions"("code");

-- CreateIndex
CREATE INDEX "payment_channel_definitions_channelType_idx" ON "payment_channel_definitions"("channelType");

-- CreateIndex
CREATE INDEX "payment_channel_definitions_isActive_idx" ON "payment_channel_definitions"("isActive");

-- CreateIndex
CREATE INDEX "payment_provider_configurations_paymentChannelDefinitionId_idx" ON "payment_provider_configurations"("paymentChannelDefinitionId");

-- CreateIndex
CREATE INDEX "payment_provider_configurations_institutionId_idx" ON "payment_provider_configurations"("institutionId");

-- CreateIndex
CREATE INDEX "payment_provider_configurations_isActive_idx" ON "payment_provider_configurations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_configurations_paymentChannelDefinitionId__key" ON "payment_provider_configurations"("paymentChannelDefinitionId", "providerCode", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_intentReference_key" ON "payment_intents"("intentReference");

-- CreateIndex
CREATE INDEX "payment_intents_invoiceId_idx" ON "payment_intents"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_paymentIntentId_idx" ON "payment_transactions"("paymentIntentId");

-- CreateIndex
CREATE INDEX "payment_transactions_paymentProviderConfigurationId_idx" ON "payment_transactions"("paymentProviderConfigurationId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_paymentProviderConfigurationId_provide_key" ON "payment_transactions"("paymentProviderConfigurationId", "providerTransactionReference");

-- CreateIndex
CREATE INDEX "payment_allocations_paymentTransactionId_idx" ON "payment_allocations"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "payment_allocations_invoiceLineId_idx" ON "payment_allocations"("invoiceLineId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipts_receiptNumber_key" ON "payment_receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_receipts_paymentTransactionId_idx" ON "payment_receipts"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "payment_provider_webhook_events_paymentProviderConfiguratio_idx" ON "payment_provider_webhook_events"("paymentProviderConfigurationId");

-- CreateIndex
CREATE INDEX "payment_provider_webhook_events_processingStatus_idx" ON "payment_provider_webhook_events"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_webhook_events_paymentProviderConfiguratio_key" ON "payment_provider_webhook_events"("paymentProviderConfigurationId", "externalEventId");

-- CreateIndex
CREATE INDEX "fee_adjustment_requests_feeAssessmentId_idx" ON "fee_adjustment_requests"("feeAssessmentId");

-- CreateIndex
CREATE INDEX "fee_adjustment_requests_status_idx" ON "fee_adjustment_requests"("status");

-- CreateIndex
CREATE INDEX "fee_adjustment_requests_requestedByIdentityId_idx" ON "fee_adjustment_requests"("requestedByIdentityId");

-- CreateIndex
CREATE INDEX "fee_adjustment_decisions_feeAdjustmentRequestId_idx" ON "fee_adjustment_decisions"("feeAdjustmentRequestId");

-- CreateIndex
CREATE INDEX "fee_adjustment_decisions_decidedByIdentityId_idx" ON "fee_adjustment_decisions"("decidedByIdentityId");

-- CreateIndex
CREATE INDEX "refund_requests_paymentTransactionId_idx" ON "refund_requests"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "refund_requests_redressImplementationActionId_idx" ON "refund_requests"("redressImplementationActionId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_requestedByIdentityId_idx" ON "refund_requests"("requestedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_authorizations_authorizationReference_key" ON "refund_authorizations"("authorizationReference");

-- CreateIndex
CREATE INDEX "refund_authorizations_refundRequestId_idx" ON "refund_authorizations"("refundRequestId");

-- CreateIndex
CREATE INDEX "refund_authorizations_authorizedByIdentityId_idx" ON "refund_authorizations"("authorizedByIdentityId");

-- CreateIndex
CREATE INDEX "refund_transactions_refundRequestId_idx" ON "refund_transactions"("refundRequestId");

-- CreateIndex
CREATE INDEX "refund_transactions_refundAuthorizationId_idx" ON "refund_transactions"("refundAuthorizationId");

-- CreateIndex
CREATE INDEX "refund_transactions_status_idx" ON "refund_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_batches_batchReference_key" ON "reconciliation_batches"("batchReference");

-- CreateIndex
CREATE INDEX "reconciliation_batches_institutionId_idx" ON "reconciliation_batches"("institutionId");

-- CreateIndex
CREATE INDEX "reconciliation_batches_status_idx" ON "reconciliation_batches"("status");

-- CreateIndex
CREATE INDEX "reconciliation_items_reconciliationBatchId_idx" ON "reconciliation_items"("reconciliationBatchId");

-- CreateIndex
CREATE INDEX "reconciliation_items_paymentTransactionId_idx" ON "reconciliation_items"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "reconciliation_items_status_idx" ON "reconciliation_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_disputes_disputeReference_key" ON "financial_disputes"("disputeReference");

-- CreateIndex
CREATE INDEX "financial_disputes_invoiceId_idx" ON "financial_disputes"("invoiceId");

-- CreateIndex
CREATE INDEX "financial_disputes_paymentTransactionId_idx" ON "financial_disputes"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "financial_disputes_status_idx" ON "financial_disputes"("status");

-- CreateIndex
CREATE INDEX "arrears_records_invoiceId_idx" ON "arrears_records"("invoiceId");

-- CreateIndex
CREATE INDEX "arrears_records_status_idx" ON "arrears_records"("status");

-- CreateIndex
CREATE INDEX "financial_approval_records_approvalType_idx" ON "financial_approval_records"("approvalType");

-- CreateIndex
CREATE INDEX "financial_approval_records_status_idx" ON "financial_approval_records"("status");

-- CreateIndex
CREATE INDEX "financial_approval_records_approvedByIdentityId_idx" ON "financial_approval_records"("approvedByIdentityId");

-- CreateIndex
CREATE INDEX "financial_approval_records_feeScheduleVersionId_idx" ON "financial_approval_records"("feeScheduleVersionId");

-- CreateIndex
CREATE INDEX "financial_approval_records_refundAuthorizationId_idx" ON "financial_approval_records"("refundAuthorizationId");

-- CreateIndex
CREATE INDEX "financial_approval_records_reconciliationBatchId_idx" ON "financial_approval_records"("reconciliationBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "communication_templates_code_key" ON "communication_templates"("code");

-- CreateIndex
CREATE INDEX "communication_templates_institutionId_idx" ON "communication_templates"("institutionId");

-- CreateIndex
CREATE INDEX "communication_templates_status_idx" ON "communication_templates"("status");

-- CreateIndex
CREATE INDEX "communication_templates_channelType_idx" ON "communication_templates"("channelType");

-- CreateIndex
CREATE INDEX "communication_template_versions_communicationTemplateId_idx" ON "communication_template_versions"("communicationTemplateId");

-- CreateIndex
CREATE INDEX "communication_template_versions_status_idx" ON "communication_template_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "communication_template_versions_communicationTemplateId_ver_key" ON "communication_template_versions"("communicationTemplateId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "communication_messages_messageReference_key" ON "communication_messages"("messageReference");

-- CreateIndex
CREATE INDEX "communication_messages_caseId_idx" ON "communication_messages"("caseId");

-- CreateIndex
CREATE INDEX "communication_messages_masterAdministrativeFileId_idx" ON "communication_messages"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "communication_messages_communicationTemplateVersionId_idx" ON "communication_messages"("communicationTemplateVersionId");

-- CreateIndex
CREATE INDEX "communication_messages_status_idx" ON "communication_messages"("status");

-- CreateIndex
CREATE INDEX "communication_messages_decisionNoticeReference_idx" ON "communication_messages"("decisionNoticeReference");

-- CreateIndex
CREATE INDEX "communication_recipients_communicationMessageId_idx" ON "communication_recipients"("communicationMessageId");

-- CreateIndex
CREATE INDEX "communication_recipients_recipientIdentityId_idx" ON "communication_recipients"("recipientIdentityId");

-- CreateIndex
CREATE INDEX "communication_deliveries_communicationMessageId_idx" ON "communication_deliveries"("communicationMessageId");

-- CreateIndex
CREATE INDEX "communication_deliveries_communicationRecipientId_idx" ON "communication_deliveries"("communicationRecipientId");

-- CreateIndex
CREATE INDEX "communication_deliveries_status_idx" ON "communication_deliveries"("status");

-- CreateIndex
CREATE INDEX "communication_delivery_attempts_communicationDeliveryId_idx" ON "communication_delivery_attempts"("communicationDeliveryId");

-- CreateIndex
CREATE INDEX "communication_delivery_attempts_status_idx" ON "communication_delivery_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "communication_delivery_attempts_communicationDeliveryId_att_key" ON "communication_delivery_attempts"("communicationDeliveryId", "attemptNumber");

-- CreateIndex
CREATE INDEX "communication_receipts_communicationDeliveryId_idx" ON "communication_receipts"("communicationDeliveryId");

-- CreateIndex
CREATE INDEX "communication_receipts_receiptType_idx" ON "communication_receipts"("receiptType");

-- CreateIndex
CREATE INDEX "communication_preferences_identityId_idx" ON "communication_preferences"("identityId");

-- CreateIndex
CREATE INDEX "communication_preferences_institutionId_idx" ON "communication_preferences"("institutionId");

-- CreateIndex
CREATE INDEX "communication_preferences_channelType_idx" ON "communication_preferences"("channelType");

-- CreateIndex
CREATE UNIQUE INDEX "mandatory_communication_rules_ruleCode_key" ON "mandatory_communication_rules"("ruleCode");

-- CreateIndex
CREATE INDEX "mandatory_communication_rules_institutionId_idx" ON "mandatory_communication_rules"("institutionId");

-- CreateIndex
CREATE INDEX "mandatory_communication_rules_governmentServiceId_idx" ON "mandatory_communication_rules"("governmentServiceId");

-- CreateIndex
CREATE INDEX "mandatory_communication_rules_status_idx" ON "mandatory_communication_rules"("status");

-- CreateIndex
CREATE INDEX "translation_records_sourceReference_idx" ON "translation_records"("sourceReference");

-- CreateIndex
CREATE INDEX "translation_records_translatorIdentityId_idx" ON "translation_records"("translatorIdentityId");

-- CreateIndex
CREATE INDEX "accessibility_accommodations_identityId_idx" ON "accessibility_accommodations"("identityId");

-- CreateIndex
CREATE INDEX "accessibility_accommodations_accommodationType_idx" ON "accessibility_accommodations"("accommodationType");

-- CreateIndex
CREATE UNIQUE INDEX "technology_dependencies_code_key" ON "technology_dependencies"("code");

-- CreateIndex
CREATE INDEX "integration_definitions_institutionId_idx" ON "integration_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "integration_definitions_technologyDependencyId_idx" ON "integration_definitions"("technologyDependencyId");

-- CreateIndex
CREATE INDEX "integration_definitions_status_idx" ON "integration_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_definitions_institutionId_code_key" ON "integration_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "integration_versions_integrationDefinitionId_idx" ON "integration_versions"("integrationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_versions_integrationDefinitionId_versionNumber_key" ON "integration_versions"("integrationDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "integration_endpoints_integrationVersionId_idx" ON "integration_endpoints"("integrationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_endpoints_integrationVersionId_endpointCode_key" ON "integration_endpoints"("integrationVersionId", "endpointCode");

-- CreateIndex
CREATE INDEX "data_exchange_contracts_integrationVersionId_idx" ON "data_exchange_contracts"("integrationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "data_exchange_contracts_integrationVersionId_contractCode_key" ON "data_exchange_contracts"("integrationVersionId", "contractCode");

-- CreateIndex
CREATE INDEX "data_exchange_fields_dataExchangeContractId_idx" ON "data_exchange_fields"("dataExchangeContractId");

-- CreateIndex
CREATE UNIQUE INDEX "data_exchange_fields_dataExchangeContractId_fieldCode_key" ON "data_exchange_fields"("dataExchangeContractId", "fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "authoritative_source_designations_sourceCode_key" ON "authoritative_source_designations"("sourceCode");

-- CreateIndex
CREATE INDEX "authoritative_source_designations_institutionId_idx" ON "authoritative_source_designations"("institutionId");

-- CreateIndex
CREATE INDEX "authoritative_source_designations_status_idx" ON "authoritative_source_designations"("status");

-- CreateIndex
CREATE INDEX "field_authority_mappings_dataExchangeFieldId_idx" ON "field_authority_mappings"("dataExchangeFieldId");

-- CreateIndex
CREATE INDEX "field_authority_mappings_authoritativeSourceDesignationId_idx" ON "field_authority_mappings"("authoritativeSourceDesignationId");

-- CreateIndex
CREATE UNIQUE INDEX "field_authority_mappings_dataExchangeFieldId_authoritativeS_key" ON "field_authority_mappings"("dataExchangeFieldId", "authoritativeSourceDesignationId");

-- CreateIndex
CREATE INDEX "integration_credential_references_integrationDefinitionId_idx" ON "integration_credential_references"("integrationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credential_references_integrationDefinitionId_c_key" ON "integration_credential_references"("integrationDefinitionId", "credentialAlias");

-- CreateIndex
CREATE INDEX "integration_acceptance_records_integrationDefinitionId_idx" ON "integration_acceptance_records"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "integration_acceptance_records_acceptanceStatus_idx" ON "integration_acceptance_records"("acceptanceStatus");

-- CreateIndex
CREATE INDEX "integration_acceptance_records_assessedByIdentityId_idx" ON "integration_acceptance_records"("assessedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_requests_requestReference_key" ON "integration_requests"("requestReference");

-- CreateIndex
CREATE INDEX "integration_requests_integrationVersionId_idx" ON "integration_requests"("integrationVersionId");

-- CreateIndex
CREATE INDEX "integration_requests_masterAdministrativeFileId_idx" ON "integration_requests"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "integration_requests_caseId_idx" ON "integration_requests"("caseId");

-- CreateIndex
CREATE INDEX "integration_requests_status_idx" ON "integration_requests"("status");

-- CreateIndex
CREATE INDEX "integration_exchanges_integrationRequestId_idx" ON "integration_exchanges"("integrationRequestId");

-- CreateIndex
CREATE INDEX "integration_exchanges_status_idx" ON "integration_exchanges"("status");

-- CreateIndex
CREATE INDEX "integration_messages_integrationExchangeId_idx" ON "integration_messages"("integrationExchangeId");

-- CreateIndex
CREATE INDEX "integration_messages_integrationEndpointId_idx" ON "integration_messages"("integrationEndpointId");

-- CreateIndex
CREATE INDEX "integration_messages_direction_idx" ON "integration_messages"("direction");

-- CreateIndex
CREATE INDEX "integration_webhook_events_integrationDefinitionId_idx" ON "integration_webhook_events"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "integration_webhook_events_processingStatus_idx" ON "integration_webhook_events"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "integration_webhook_events_integrationDefinitionId_external_key" ON "integration_webhook_events"("integrationDefinitionId", "externalEventId");

-- CreateIndex
CREATE INDEX "integration_data_transformations_integrationMessageId_idx" ON "integration_data_transformations"("integrationMessageId");

-- CreateIndex
CREATE INDEX "integration_validation_results_integrationExchangeId_idx" ON "integration_validation_results"("integrationExchangeId");

-- CreateIndex
CREATE INDEX "integration_validation_results_isValid_idx" ON "integration_validation_results"("isValid");

-- CreateIndex
CREATE INDEX "external_record_references_integrationDefinitionId_idx" ON "external_record_references"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "external_record_references_localReferenceType_localReferenc_idx" ON "external_record_references"("localReferenceType", "localReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "external_record_references_integrationDefinitionId_external_key" ON "external_record_references"("integrationDefinitionId", "externalSystemCode", "externalRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "registry_queries_queryReference_key" ON "registry_queries"("queryReference");

-- CreateIndex
CREATE INDEX "registry_queries_externalRecordReferenceId_idx" ON "registry_queries"("externalRecordReferenceId");

-- CreateIndex
CREATE INDEX "registry_queries_integrationDefinitionId_idx" ON "registry_queries"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "registry_queries_status_idx" ON "registry_queries"("status");

-- CreateIndex
CREATE INDEX "registry_synchronizations_registryQueryId_idx" ON "registry_synchronizations"("registryQueryId");

-- CreateIndex
CREATE INDEX "registry_synchronizations_syncResult_idx" ON "registry_synchronizations"("syncResult");

-- CreateIndex
CREATE INDEX "source_discrepancies_integrationDefinitionId_idx" ON "source_discrepancies"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "source_discrepancies_status_idx" ON "source_discrepancies"("status");

-- CreateIndex
CREATE INDEX "source_discrepancy_resolutions_sourceDiscrepancyId_idx" ON "source_discrepancy_resolutions"("sourceDiscrepancyId");

-- CreateIndex
CREATE INDEX "source_discrepancy_resolutions_resolvedByIdentityId_idx" ON "source_discrepancy_resolutions"("resolvedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_reconciliation_records_reconciliationReference_key" ON "integration_reconciliation_records"("reconciliationReference");

-- CreateIndex
CREATE INDEX "integration_reconciliation_records_integrationDefinitionId_idx" ON "integration_reconciliation_records"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "integration_reconciliation_records_status_idx" ON "integration_reconciliation_records"("status");

-- CreateIndex
CREATE INDEX "integration_dead_letter_records_integrationDefinitionId_idx" ON "integration_dead_letter_records"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "integration_dead_letter_records_integrationMessageId_idx" ON "integration_dead_letter_records"("integrationMessageId");

-- CreateIndex
CREATE INDEX "integration_outages_integrationDefinitionId_idx" ON "integration_outages"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "integration_outages_status_idx" ON "integration_outages"("status");

-- CreateIndex
CREATE INDEX "integration_fallback_activations_integrationOutageId_idx" ON "integration_fallback_activations"("integrationOutageId");

-- CreateIndex
CREATE INDEX "integration_fallback_activations_integrationDefinitionId_idx" ON "integration_fallback_activations"("integrationDefinitionId");

-- CreateIndex
CREATE INDEX "integration_fallback_activations_status_idx" ON "integration_fallback_activations"("status");

-- CreateIndex
CREATE INDEX "integration_recovery_events_integrationOutageId_idx" ON "integration_recovery_events"("integrationOutageId");

-- CreateIndex
CREATE INDEX "integration_recovery_events_verifiedByIdentityId_idx" ON "integration_recovery_events"("verifiedByIdentityId");

-- CreateIndex
CREATE INDEX "archival_transfer_items_archivalTransferId_idx" ON "archival_transfer_items"("archivalTransferId");

-- CreateIndex
CREATE INDEX "archival_transfers_status_idx" ON "archival_transfers"("status");

-- CreateIndex
CREATE INDEX "archival_transfers_sourceRepositoryId_idx" ON "archival_transfers"("sourceRepositoryId");

-- CreateIndex
CREATE INDEX "archival_transfers_destinationRepositoryId_idx" ON "archival_transfers"("destinationRepositoryId");

-- CreateIndex
CREATE INDEX "decision_conditions_governmentDecisionId_idx" ON "decision_conditions"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "decision_conditions_conditionType_status_idx" ON "decision_conditions"("conditionType", "status");

-- CreateIndex
CREATE INDEX "instrument_number_reservations_numberingRuleId_status_idx" ON "instrument_number_reservations"("numberingRuleId", "status");

-- CreateIndex
CREATE INDEX "instrument_numbering_rules_institutionId_idx" ON "instrument_numbering_rules"("institutionId");

-- CreateIndex
CREATE INDEX "instrument_template_versions_instrumentTemplateId_idx" ON "instrument_template_versions"("instrumentTemplateId");

-- CreateIndex
CREATE INDEX "instrument_templates_instrumentTypeVersionId_idx" ON "instrument_templates"("instrumentTypeVersionId");

-- CreateIndex
CREATE INDEX "instrument_type_eligible_decision_types_decisionTypeVersion_idx" ON "instrument_type_eligible_decision_types"("decisionTypeVersionId");

-- CreateIndex
CREATE INDEX "instrument_type_versions_instrumentTypeDefinitionId_idx" ON "instrument_type_versions"("instrumentTypeDefinitionId");

-- CreateIndex
CREATE INDEX "instrument_type_versions_issuingInstitutionId_idx" ON "instrument_type_versions"("issuingInstitutionId");

-- CreateIndex
CREATE INDEX "instrument_type_versions_numberingRuleId_idx" ON "instrument_type_versions"("numberingRuleId");

-- CreateIndex
CREATE INDEX "issuance_events_officialInstrumentId_idx" ON "issuance_events"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "issuance_events_governmentDecisionId_idx" ON "issuance_events"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "issuance_events_caseId_idx" ON "issuance_events"("caseId");

-- CreateIndex
CREATE INDEX "issuance_events_status_idx" ON "issuance_events"("status");

-- CreateIndex
CREATE INDEX "issuance_readiness_assessments_governmentDecisionId_idx" ON "issuance_readiness_assessments"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "issuance_readiness_assessments_caseId_idx" ON "issuance_readiness_assessments"("caseId");

-- CreateIndex
CREATE INDEX "issuance_readiness_assessments_officialInstrumentId_idx" ON "issuance_readiness_assessments"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "legal_hold_release_records_legalHoldId_idx" ON "legal_hold_release_records"("legalHoldId");

-- CreateIndex
CREATE INDEX "legal_hold_release_records_releasedAt_idx" ON "legal_hold_release_records"("releasedAt");

-- CreateIndex
CREATE INDEX "legal_hold_targets_targetType_targetReference_idx" ON "legal_hold_targets"("targetType", "targetReference");

-- CreateIndex
CREATE INDEX "legal_hold_targets_legalHoldId_idx" ON "legal_hold_targets"("legalHoldId");

-- CreateIndex
CREATE INDEX "legal_holds_status_idx" ON "legal_holds"("status");

-- CreateIndex
CREATE INDEX "legal_holds_effectiveFrom_idx" ON "legal_holds"("effectiveFrom");

-- CreateIndex
CREATE INDEX "official_instrument_versions_officialInstrumentId_idx" ON "official_instrument_versions"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "official_instrument_versions_documentVersionId_idx" ON "official_instrument_versions"("documentVersionId");

-- CreateIndex
CREATE INDEX "official_instruments_caseId_idx" ON "official_instruments"("caseId");

-- CreateIndex
CREATE INDEX "official_instruments_governmentDecisionId_idx" ON "official_instruments"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "official_instruments_instrumentTypeVersionId_idx" ON "official_instruments"("instrumentTypeVersionId");

-- CreateIndex
CREATE INDEX "official_instruments_status_idx" ON "official_instruments"("status");

-- CreateIndex
CREATE INDEX "preservation_collection_items_preservationCollectionId_idx" ON "preservation_collection_items"("preservationCollectionId");

-- CreateIndex
CREATE INDEX "preservation_collections_status_idx" ON "preservation_collections"("status");

-- CreateIndex
CREATE INDEX "preservation_collections_purpose_idx" ON "preservation_collections"("purpose");

-- CreateIndex
CREATE INDEX "record_disposition_records_dispositionRequestId_idx" ON "record_disposition_records"("dispositionRequestId");

-- CreateIndex
CREATE INDEX "record_disposition_records_dispositionDate_idx" ON "record_disposition_records"("dispositionDate");

-- CreateIndex
CREATE INDEX "record_disposition_requests_targetType_targetReference_idx" ON "record_disposition_requests"("targetType", "targetReference");

-- CreateIndex
CREATE INDEX "record_disposition_requests_status_idx" ON "record_disposition_requests"("status");

-- CreateIndex
CREATE INDEX "record_disposition_requests_retentionScheduleId_idx" ON "record_disposition_requests"("retentionScheduleId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_recordsClassificationId_idx" ON "record_retention_assignments"("recordsClassificationId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_retentionScheduleId_idx" ON "record_retention_assignments"("retentionScheduleId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_targetType_targetReference_idx" ON "record_retention_assignments"("targetType", "targetReference");

-- CreateIndex
CREATE INDEX "records_classifications_governingSourceId_idx" ON "records_classifications"("governingSourceId");

-- CreateIndex
CREATE INDEX "records_classifications_status_idx" ON "records_classifications"("status");

-- CreateIndex
CREATE INDEX "retention_rules_retentionScheduleId_idx" ON "retention_rules"("retentionScheduleId");

-- CreateIndex
CREATE INDEX "retention_schedules_recordsClassificationId_idx" ON "retention_schedules"("recordsClassificationId");

-- CreateIndex
CREATE INDEX "retention_schedules_governingSourceId_idx" ON "retention_schedules"("governingSourceId");

-- CreateIndex
CREATE INDEX "retention_schedules_status_idx" ON "retention_schedules"("status");

-- RenameForeignKey
ALTER TABLE "decision_readiness_assessments" RENAME CONSTRAINT "decision_readiness_assessments_proposedDecisionMakerIdentityId_" TO "decision_readiness_assessments_proposedDecisionMakerIdenti_fkey";

-- RenameForeignKey
ALTER TABLE "decision_readiness_assessments" RENAME CONSTRAINT "decision_readiness_assessments_proposedDecisionMakerOfficeholde" TO "decision_readiness_assessments_proposedDecisionMakerOffice_fkey";

-- RenameForeignKey
ALTER TABLE "evidence_packet_item_exclusions" RENAME CONSTRAINT "evidence_packet_item_exclusions_authorityEvaluationRecordId_fke" TO "evidence_packet_item_exclusions_authorityEvaluationRecordI_fkey";

-- RenameForeignKey
ALTER TABLE "government_communication_documents" RENAME CONSTRAINT "government_communication_documents_governmentCommunicationId_fk" TO "government_communication_documents_governmentCommunication_fkey";

-- RenameForeignKey
ALTER TABLE "government_communication_evidence" RENAME CONSTRAINT "government_communication_evidence_governmentCommunicationId_fke" TO "government_communication_evidence_governmentCommunicationI_fkey";

-- RenameForeignKey
ALTER TABLE "government_communication_records" RENAME CONSTRAINT "government_communication_records_retainedDeterminationForExtern" TO "government_communication_records_retainedDeterminationForE_fkey";

-- RenameForeignKey
ALTER TABLE "instrument_receipt_acknowledgments" RENAME CONSTRAINT "instrument_receipt_acknowledgments_instrumentDeliveryAttemptId_" TO "instrument_receipt_acknowledgments_instrumentDeliveryAttem_fkey";

-- RenameForeignKey
ALTER TABLE "instrument_type_eligible_decision_types" RENAME CONSTRAINT "instrument_type_eligible_decision_types_decisionTypeVersionId_f" TO "instrument_type_eligible_decision_types_decisionTypeVersio_fkey";

-- RenameForeignKey
ALTER TABLE "instrument_type_eligible_decision_types" RENAME CONSTRAINT "instrument_type_eligible_decision_types_instrumentTypeVersionId" TO "instrument_type_eligible_decision_types_instrumentTypeVers_fkey";

-- RenameForeignKey
ALTER TABLE "master_administrative_file_sections" RENAME CONSTRAINT "master_administrative_file_sections_masterAdministrativeFileId_" TO "master_administrative_file_sections_masterAdministrativeFi_fkey";

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionTypeVersionId_fkey" FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionReadinessAssessmentId_fkey" FOREIGN KEY ("decisionReadinessAssessmentId") REFERENCES "decision_readiness_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_instrumentTypeVersionId_fkey" FOREIGN KEY ("instrumentTypeVersionId") REFERENCES "instrument_type_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_issuerOfficeholderId_fkey" FOREIGN KEY ("issuerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instrument_versions" ADD CONSTRAINT "official_instrument_versions_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "instrument_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instrument_versions" ADD CONSTRAINT "official_instrument_versions_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_events" ADD CONSTRAINT "instrument_lifecycle_events_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_events" ADD CONSTRAINT "instrument_lifecycle_events_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_decision_links" ADD CONSTRAINT "instrument_lifecycle_decision_links_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_newVersionId_fkey" FOREIGN KEY ("newVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_newVersionId_fkey" FOREIGN KEY ("newVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_suspension_records" ADD CONSTRAINT "instrument_suspension_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_suspension_records" ADD CONSTRAINT "instrument_suspension_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_revocation_records" ADD CONSTRAINT "instrument_revocation_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_revocation_records" ADD CONSTRAINT "instrument_revocation_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_reinstatement_records" ADD CONSTRAINT "instrument_reinstatement_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_reinstatement_records" ADD CONSTRAINT "instrument_reinstatement_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_replacementVersionId_fkey" FOREIGN KEY ("replacementVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_surrender_records" ADD CONSTRAINT "instrument_surrender_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_surrender_records" ADD CONSTRAINT "instrument_surrender_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_review_references" ADD CONSTRAINT "decision_review_references_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_review_references" ADD CONSTRAINT "decision_review_references_challengedInstrumentId_fkey" FOREIGN KEY ("challengedInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_feeScheduleId_fkey" FOREIGN KEY ("feeScheduleId") REFERENCES "fee_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_feeScheduleVersionId_fkey" FOREIGN KEY ("feeScheduleVersionId") REFERENCES "fee_schedule_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_feeScheduleVersionId_fkey" FOREIGN KEY ("feeScheduleVersionId") REFERENCES "fee_schedule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_feeAssessmentId_fkey" FOREIGN KEY ("feeAssessmentId") REFERENCES "fee_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_feeScheduleItemId_fkey" FOREIGN KEY ("feeScheduleItemId") REFERENCES "fee_schedule_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_configurations" ADD CONSTRAINT "payment_provider_configurations_paymentChannelDefinitionId_fkey" FOREIGN KEY ("paymentChannelDefinitionId") REFERENCES "payment_channel_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_configurations" ADD CONSTRAINT "payment_provider_configurations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentProviderConfigurationId_fkey" FOREIGN KEY ("paymentProviderConfigurationId") REFERENCES "payment_provider_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoiceLineId_fkey" FOREIGN KEY ("invoiceLineId") REFERENCES "invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_webhook_events" ADD CONSTRAINT "payment_provider_webhook_events_paymentProviderConfigurati_fkey" FOREIGN KEY ("paymentProviderConfigurationId") REFERENCES "payment_provider_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_adjustment_requests" ADD CONSTRAINT "fee_adjustment_requests_feeAssessmentId_fkey" FOREIGN KEY ("feeAssessmentId") REFERENCES "fee_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_adjustment_requests" ADD CONSTRAINT "fee_adjustment_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_adjustment_decisions" ADD CONSTRAINT "fee_adjustment_decisions_feeAdjustmentRequestId_fkey" FOREIGN KEY ("feeAdjustmentRequestId") REFERENCES "fee_adjustment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_adjustment_decisions" ADD CONSTRAINT "fee_adjustment_decisions_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_redressImplementationActionId_fkey" FOREIGN KEY ("redressImplementationActionId") REFERENCES "redress_implementation_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_authorizations" ADD CONSTRAINT "refund_authorizations_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_authorizations" ADD CONSTRAINT "refund_authorizations_authorizedByIdentityId_fkey" FOREIGN KEY ("authorizedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_refundAuthorizationId_fkey" FOREIGN KEY ("refundAuthorizationId") REFERENCES "refund_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_batches" ADD CONSTRAINT "reconciliation_batches_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_reconciliationBatchId_fkey" FOREIGN KEY ("reconciliationBatchId") REFERENCES "reconciliation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrears_records" ADD CONSTRAINT "arrears_records_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_feeScheduleVersionId_fkey" FOREIGN KEY ("feeScheduleVersionId") REFERENCES "fee_schedule_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_refundAuthorizationId_fkey" FOREIGN KEY ("refundAuthorizationId") REFERENCES "refund_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_reconciliationBatchId_fkey" FOREIGN KEY ("reconciliationBatchId") REFERENCES "reconciliation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_template_versions" ADD CONSTRAINT "communication_template_versions_communicationTemplateId_fkey" FOREIGN KEY ("communicationTemplateId") REFERENCES "communication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_communicationTemplateVersionId_fkey" FOREIGN KEY ("communicationTemplateVersionId") REFERENCES "communication_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_communicationMessageId_fkey" FOREIGN KEY ("communicationMessageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_recipientIdentityId_fkey" FOREIGN KEY ("recipientIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_deliveries" ADD CONSTRAINT "communication_deliveries_communicationMessageId_fkey" FOREIGN KEY ("communicationMessageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_deliveries" ADD CONSTRAINT "communication_deliveries_communicationRecipientId_fkey" FOREIGN KEY ("communicationRecipientId") REFERENCES "communication_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_delivery_attempts" ADD CONSTRAINT "communication_delivery_attempts_communicationDeliveryId_fkey" FOREIGN KEY ("communicationDeliveryId") REFERENCES "communication_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_receipts" ADD CONSTRAINT "communication_receipts_communicationDeliveryId_fkey" FOREIGN KEY ("communicationDeliveryId") REFERENCES "communication_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandatory_communication_rules" ADD CONSTRAINT "mandatory_communication_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandatory_communication_rules" ADD CONSTRAINT "mandatory_communication_rules_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_records" ADD CONSTRAINT "translation_records_translatorIdentityId_fkey" FOREIGN KEY ("translatorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessibility_accommodations" ADD CONSTRAINT "accessibility_accommodations_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_definitions" ADD CONSTRAINT "integration_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_definitions" ADD CONSTRAINT "integration_definitions_technologyDependencyId_fkey" FOREIGN KEY ("technologyDependencyId") REFERENCES "technology_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_versions" ADD CONSTRAINT "integration_versions_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_endpoints" ADD CONSTRAINT "integration_endpoints_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_exchange_contracts" ADD CONSTRAINT "data_exchange_contracts_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_exchange_fields" ADD CONSTRAINT "data_exchange_fields_dataExchangeContractId_fkey" FOREIGN KEY ("dataExchangeContractId") REFERENCES "data_exchange_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authoritative_source_designations" ADD CONSTRAINT "authoritative_source_designations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_authority_mappings" ADD CONSTRAINT "field_authority_mappings_dataExchangeFieldId_fkey" FOREIGN KEY ("dataExchangeFieldId") REFERENCES "data_exchange_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_authority_mappings" ADD CONSTRAINT "field_authority_mappings_authoritativeSourceDesignationId_fkey" FOREIGN KEY ("authoritativeSourceDesignationId") REFERENCES "authoritative_source_designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_credential_references" ADD CONSTRAINT "integration_credential_references_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_acceptance_records" ADD CONSTRAINT "integration_acceptance_records_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_acceptance_records" ADD CONSTRAINT "integration_acceptance_records_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_exchanges" ADD CONSTRAINT "integration_exchanges_integrationRequestId_fkey" FOREIGN KEY ("integrationRequestId") REFERENCES "integration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_messages" ADD CONSTRAINT "integration_messages_integrationExchangeId_fkey" FOREIGN KEY ("integrationExchangeId") REFERENCES "integration_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_messages" ADD CONSTRAINT "integration_messages_integrationEndpointId_fkey" FOREIGN KEY ("integrationEndpointId") REFERENCES "integration_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhook_events" ADD CONSTRAINT "integration_webhook_events_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_data_transformations" ADD CONSTRAINT "integration_data_transformations_integrationMessageId_fkey" FOREIGN KEY ("integrationMessageId") REFERENCES "integration_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_validation_results" ADD CONSTRAINT "integration_validation_results_integrationExchangeId_fkey" FOREIGN KEY ("integrationExchangeId") REFERENCES "integration_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_record_references" ADD CONSTRAINT "external_record_references_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_queries" ADD CONSTRAINT "registry_queries_externalRecordReferenceId_fkey" FOREIGN KEY ("externalRecordReferenceId") REFERENCES "external_record_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_queries" ADD CONSTRAINT "registry_queries_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_synchronizations" ADD CONSTRAINT "registry_synchronizations_registryQueryId_fkey" FOREIGN KEY ("registryQueryId") REFERENCES "registry_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_discrepancies" ADD CONSTRAINT "source_discrepancies_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_discrepancy_resolutions" ADD CONSTRAINT "source_discrepancy_resolutions_sourceDiscrepancyId_fkey" FOREIGN KEY ("sourceDiscrepancyId") REFERENCES "source_discrepancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_discrepancy_resolutions" ADD CONSTRAINT "source_discrepancy_resolutions_resolvedByIdentityId_fkey" FOREIGN KEY ("resolvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_reconciliation_records" ADD CONSTRAINT "integration_reconciliation_records_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_dead_letter_records" ADD CONSTRAINT "integration_dead_letter_records_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_dead_letter_records" ADD CONSTRAINT "integration_dead_letter_records_integrationMessageId_fkey" FOREIGN KEY ("integrationMessageId") REFERENCES "integration_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_outages" ADD CONSTRAINT "integration_outages_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_fallback_activations" ADD CONSTRAINT "integration_fallback_activations_integrationOutageId_fkey" FOREIGN KEY ("integrationOutageId") REFERENCES "integration_outages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_fallback_activations" ADD CONSTRAINT "integration_fallback_activations_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_recovery_events" ADD CONSTRAINT "integration_recovery_events_integrationOutageId_fkey" FOREIGN KEY ("integrationOutageId") REFERENCES "integration_outages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_recovery_events" ADD CONSTRAINT "integration_recovery_events_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence_packet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_B_fkey" FOREIGN KEY ("B") REFERENCES "evidence_purpose_acceptances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "archival_transfer_items_archivalTransferId_targetType_targetRef" RENAME TO "archival_transfer_items_archivalTransferId_targetType_targe_key";

-- RenameIndex
ALTER INDEX "departmental_review_evidence_departmentalReviewId_evidenceRecor" RENAME TO "departmental_review_evidence_departmentalReviewId_evidenceR_key";

-- RenameIndex
ALTER INDEX "departmental_review_records_caseId_departmentId_reviewVersion_k" RENAME TO "departmental_review_records_caseId_departmentId_reviewVersi_key";

-- RenameIndex
ALTER INDEX "document_associations_documentVersionId_targetType_targetId_ass" RENAME TO "document_associations_documentVersionId_targetType_targetId_key";

-- RenameIndex
ALTER INDEX "evidence_quality_assessments_evidenceId_criterion_assessmentSou" RENAME TO "evidence_quality_assessments_evidenceId_criterion_assessmen_key";

-- RenameIndex
ALTER INDEX "government_communication_documents_governmentCommunicationId_do" RENAME TO "government_communication_documents_governmentCommunicationI_key";

-- RenameIndex
ALTER INDEX "government_communication_evidence_governmentCommunicationId_evi" RENAME TO "government_communication_evidence_governmentCommunicationId_key";

-- RenameIndex
ALTER INDEX "instrument_delivery_attempts_instrumentDeliveryId_attemptNumber" RENAME TO "instrument_delivery_attempts_instrumentDeliveryId_attemptNu_key";

-- RenameIndex
ALTER INDEX "instrument_number_reservations_numberingRuleId_reservedNumber_k" RENAME TO "instrument_number_reservations_numberingRuleId_reservedNumb_key";

-- RenameIndex
ALTER INDEX "instrument_template_versions_instrumentTemplateId_versionNumber" RENAME TO "instrument_template_versions_instrumentTemplateId_versionNu_key";

-- RenameIndex
ALTER INDEX "instrument_type_eligible_decision_types_instrumentTypeVersionId" RENAME TO "instrument_type_eligible_decision_types_instrumentTypeVersi_key";

-- RenameIndex
ALTER INDEX "instrument_type_versions_instrumentTypeDefinitionId_versionNumb" RENAME TO "instrument_type_versions_instrumentTypeDefinitionId_version_key";

-- RenameIndex
ALTER INDEX "obligation_schedules_continuingObligationId_occurrenceNumber_ke" RENAME TO "obligation_schedules_continuingObligationId_occurrenceNumbe_key";

-- RenameIndex
ALTER INDEX "official_instrument_versions_officialInstrumentId_versionNumber" RENAME TO "official_instrument_versions_officialInstrumentId_versionNu_key";

-- RenameIndex
ALTER INDEX "preservation_collection_items_preservationCollectionId_targetTy" RENAME TO "preservation_collection_items_preservationCollectionId_targ_key";

-- RenameIndex
ALTER INDEX "professional_review_evidence_professionalReviewId_evidenceRecor" RENAME TO "professional_review_evidence_professionalReviewId_evidenceR_key";

-- RenameIndex
ALTER INDEX "record_retention_assignments_targetType_targetReference_retenti" RENAME TO "record_retention_assignments_targetType_targetReference_ret_key";
