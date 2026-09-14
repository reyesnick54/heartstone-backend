import { Injectable } from '@nestjs/common';
import { type MasterAdministrativeFile, MasterAdministrativeFileSectionType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { MasterAdministrativeFileService } from './master-administrative-file.service';
import {
  MasterAdministrativeFileAccessService,
  type MasterFileAccessContext,
  type MasterFileAccessLevel,
} from './master-administrative-file-access.service';

export interface MasterFileIndexReference {
  referenceType: string;
  referenceId: string;
  label: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

interface CommunicationMessageIndexEntry {
  id: string;
  messageReference: string;
  decisionNoticeReference: string | null;
  createdAt: Date;
  communicationTemplateVersionId: string | null;
}

export interface MasterFileSectionIndex {
  sectionType: MasterAdministrativeFileSectionType;
  sectionNumber: number;
  title: string;
  isRestricted: boolean;
  references: MasterFileIndexReference[];
}

export interface MasterAdministrativeFileIndex {
  file: MasterAdministrativeFile;
  accessLevel: MasterFileAccessLevel;
  sections: MasterFileSectionIndex[];
  disclaimers: string[];
}

@Injectable()
export class MasterAdministrativeFileIndexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masterFileService: MasterAdministrativeFileService,
    private readonly accessService: MasterAdministrativeFileAccessService,
  ) {}

  async buildIndex(
    fileId: string,
    accessContext: MasterFileAccessContext,
  ): Promise<MasterAdministrativeFileIndex> {
    const file = await this.masterFileService.findById(fileId);
    const accessLevel = await this.accessService.resolveAccessLevel(file, accessContext);
    const allowedSectionTypes = this.accessService.filterSectionTypes(
      accessLevel,
      file.sections.map((section) => section.sectionType),
    );

    const [
      application,
      caseRecord,
      submissions,
      events,
      communications,
      communicationIndexEntries,
      workflowInstance,
      officialInstruments,
      governmentDecisions,
      feeAssessments,
      invoices,
    ] = await Promise.all([
      this.prisma.application.findUnique({ where: { id: file.applicationId } }),
      this.prisma.case.findUnique({ where: { id: file.caseId } }),
      this.prisma.applicationSubmission.findMany({
        where: { applicationId: file.applicationId },
        orderBy: { sequenceNumber: 'asc' },
      }),
      this.prisma.caseEvent.findMany({
        where: { caseId: file.caseId },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.caseCommunication.findMany({
        where: { caseId: file.caseId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.communicationMessage.findMany({
        where: { masterAdministrativeFileId: file.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.caseWorkflowInstance.findUnique({ where: { caseId: file.caseId } }),
      this.prisma.officialInstrument.findMany({
        where: { caseId: file.caseId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.governmentDecision.findMany({
        where: { caseId: file.caseId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.feeAssessment.findMany({
        where: { masterAdministrativeFileId: file.id },
        orderBy: { calculatedAt: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: { masterAdministrativeFileId: file.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const filteredCommunications = this.accessService.filterCommunications(
      accessLevel,
      communications,
    );

    const sectionIndexes: MasterFileSectionIndex[] = file.sections
      .filter((section) => allowedSectionTypes.includes(section.sectionType))
      .map((section) => ({
        sectionType: section.sectionType,
        sectionNumber: section.sectionNumber,
        title: section.title,
        isRestricted: section.isRestricted,
        references: this.buildSectionReferences(section.sectionType, {
          file,
          application,
          caseRecord,
          submissions,
          events,
          communications: filteredCommunications,
          communicationIndexEntries,
          workflowInstance,
          officialInstruments,
          governmentDecisions,
          feeAssessments,
          invoices,
        }),
      }));

    return {
      file: this.accessService.sanitizeFileView(accessLevel, file),
      accessLevel,
      sections: sectionIndexes,
      disclaimers: [
        'Master File sections index existing Phase 3–6 records; substantive content is not copied.',
        'Applicant access does not include the complete restricted Master File.',
        'Index references do not constitute decisions, verified evidence, or issuance.',
      ],
    };
  }

  private buildSectionReferences(
    sectionType: MasterAdministrativeFileSectionType,
    context: {
      file: MasterAdministrativeFile;
      application: Awaited<ReturnType<PrismaService['application']['findUnique']>>;
      caseRecord: Awaited<ReturnType<PrismaService['case']['findUnique']>>;
      submissions: Awaited<ReturnType<PrismaService['applicationSubmission']['findMany']>>;
      events: Awaited<ReturnType<PrismaService['caseEvent']['findMany']>>;
      communications: Awaited<ReturnType<PrismaService['caseCommunication']['findMany']>>;
      communicationIndexEntries: CommunicationMessageIndexEntry[];
      workflowInstance: Awaited<ReturnType<PrismaService['caseWorkflowInstance']['findUnique']>>;
      officialInstruments: Awaited<ReturnType<PrismaService['officialInstrument']['findMany']>>;
      governmentDecisions: Awaited<ReturnType<PrismaService['governmentDecision']['findMany']>>;
      feeAssessments: Awaited<ReturnType<PrismaService['feeAssessment']['findMany']>>;
      invoices: Awaited<ReturnType<PrismaService['invoice']['findMany']>>;
    },
  ): MasterFileIndexReference[] {
    switch (sectionType) {
      case MasterAdministrativeFileSectionType.FILE_CONTROL_AND_INDEX:
        return [
          {
            referenceType: 'MasterAdministrativeFile',
            referenceId: context.file.id,
            label: context.file.fileNumber,
          },
          {
            referenceType: 'Case',
            referenceId: context.file.caseId,
            label: context.caseRecord?.caseNumber ?? context.file.caseId,
            metadata: {
              caseStatus: context.caseRecord?.status,
              legalStatus: context.caseRecord?.legalStatus,
              fileLifecycleStatus: context.file.lifecycleStatus,
            },
          },
        ];
      case MasterAdministrativeFileSectionType.APPLICANT_AND_REPRESENTATION:
        return context.application
          ? [
              {
                referenceType: 'Identity',
                referenceId: context.application.applicantIdentityId,
                label: 'Applicant identity',
              },
              {
                referenceType: 'Application',
                referenceId: context.application.id,
                label: context.application.applicationNumber ?? context.application.id,
              },
            ]
          : [];
      case MasterAdministrativeFileSectionType.APPLICATION_HISTORY:
        return [
          ...(context.application
            ? [
                {
                  referenceType: 'Application',
                  referenceId: context.application.id,
                  label: context.application.applicationNumber ?? context.application.id,
                  occurredAt: context.application.createdAt.toISOString(),
                  metadata: { status: context.application.status },
                },
              ]
            : []),
          ...context.submissions.map((submission) => ({
            referenceType: 'ApplicationSubmission',
            referenceId: submission.id,
            label: submission.submissionNumber,
            occurredAt: submission.submittedAt.toISOString(),
            metadata: { sequenceNumber: submission.sequenceNumber, status: submission.status },
          })),
        ];
      case MasterAdministrativeFileSectionType.AUTHORITY_AND_PROCEDURE:
        return context.workflowInstance
          ? [
              {
                referenceType: 'CaseWorkflowInstance',
                referenceId: context.workflowInstance.id,
                label: context.workflowInstance.workflowVersionId,
                metadata: {
                  status: context.workflowInstance.status,
                  currentStepKeys: context.workflowInstance.currentStepKeys,
                },
              },
            ]
          : context.caseRecord
            ? [
                {
                  referenceType: 'WorkflowVersion',
                  referenceId: context.caseRecord.workflowVersionId,
                  label: context.caseRecord.workflowVersionId,
                },
              ]
            : [];
      case MasterAdministrativeFileSectionType.COMPLETENESS_REVIEW:
        return context.events
          .filter((event) =>
            [
              'COMPLETENESS_REVIEW_STARTED',
              'COMPLETENESS_STARTED',
              'COMPLETENESS_REVIEW_COMPLETED',
              'COMPLETENESS_COMPLETED',
              'DEFICIENCY_ISSUED',
            ].includes(event.eventType),
          )
          .map((event) => ({
            referenceType: 'CaseEvent',
            referenceId: event.id,
            label: event.eventType,
            occurredAt: event.occurredAt.toISOString(),
          }));
      case MasterAdministrativeFileSectionType.GOVERNMENT_REFERRALS:
        return context.events
          .filter((event) =>
            [
              'REFERRAL_CREATED',
              'REFERRED',
              'REFERRAL_ACKNOWLEDGED',
              'REFERRAL_RESPONSE_RECEIVED',
            ].includes(event.eventType),
          )
          .map((event) => ({
            referenceType: 'CaseEvent',
            referenceId: event.id,
            label: event.eventType,
            occurredAt: event.occurredAt.toISOString(),
          }));
      case MasterAdministrativeFileSectionType.PROFESSIONAL_REVIEWS:
        return context.events
          .filter((event) => event.eventType === 'PROFESSIONAL_REVIEW_REQUESTED')
          .map((event) => ({
            referenceType: 'CaseEvent',
            referenceId: event.id,
            label: event.eventType,
            occurredAt: event.occurredAt.toISOString(),
          }));
      case MasterAdministrativeFileSectionType.INSPECTIONS:
        return context.events
          .filter((event) => event.eventType === 'INSPECTION_REQUESTED')
          .map((event) => ({
            referenceType: 'CaseEvent',
            referenceId: event.id,
            label: event.eventType,
            occurredAt: event.occurredAt.toISOString(),
          }));
      case MasterAdministrativeFileSectionType.COMMUNICATIONS_AND_NOTICES:
        return [
          ...context.communications.map((communication) => ({
            referenceType: 'CaseCommunication',
            referenceId: communication.id,
            label: communication.communicationType ?? communication.subject ?? 'COMMUNICATION',
            occurredAt: communication.createdAt.toISOString(),
            metadata: {
              classification: communication.classification,
              visibility: communication.visibility,
            },
          })),
          ...context.communicationIndexEntries.map((entry) => ({
            referenceType: 'CommunicationMessage',
            referenceId: entry.id,
            label: entry.messageReference,
            occurredAt: entry.createdAt.toISOString(),
            metadata: {
              templateVersionId: entry.communicationTemplateVersionId,
              canonicalNoticeReference: entry.decisionNoticeReference,
            },
          })),
        ];
      case MasterAdministrativeFileSectionType.AUDIT_AND_TECHNICAL_HISTORY:
        return context.events.map((event) => ({
          referenceType: 'CaseEvent',
          referenceId: event.id,
          label: event.eventType,
          occurredAt: event.occurredAt.toISOString(),
        }));
      case MasterAdministrativeFileSectionType.ISSUANCE:
        return context.officialInstruments.map((instrument) => ({
          referenceType: 'OfficialInstrument',
          referenceId: instrument.id,
          label: instrument.instrumentNumber ?? instrument.id,
          occurredAt: instrument.createdAt.toISOString(),
          metadata: {
            status: instrument.status,
            issuerSource: instrument.issuerSource,
          },
        }));
      case MasterAdministrativeFileSectionType.RECOMMENDATION_AND_DECISION:
        return context.governmentDecisions.map((decision) => ({
          referenceType: 'GovernmentDecision',
          referenceId: decision.id,
          label: decision.decisionNumber,
          occurredAt: (decision.decidedAt ?? decision.createdAt).toISOString(),
          metadata: {
            outcome: decision.outcome,
            status: decision.decisionStatus,
          },
        }));
      case MasterAdministrativeFileSectionType.FEES_AND_FINANCIAL_RECORDS:
        return [
          ...context.feeAssessments.map((assessment) => ({
            referenceType: 'FeeAssessment',
            referenceId: assessment.id,
            label: assessment.assessmentReference,
            occurredAt: assessment.calculatedAt.toISOString(),
            metadata: {
              status: assessment.status,
              totalAmountCents: assessment.totalAmountCents,
              currency: assessment.currency,
              feeScheduleVersionId: assessment.feeScheduleVersionId,
            },
          })),
          ...context.invoices.map((invoice) => ({
            referenceType: 'Invoice',
            referenceId: invoice.id,
            label: invoice.invoiceNumber,
            occurredAt: (invoice.issuedAt ?? invoice.createdAt).toISOString(),
            metadata: {
              status: invoice.status,
              totalAmountCents: invoice.totalAmountCents,
              amountPaidCents: invoice.amountPaidCents,
              currency: invoice.currency,
            },
          })),
        ];
      default:
        return [];
    }
  }
}
