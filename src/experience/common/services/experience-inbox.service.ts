import { Injectable } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  CommunicationMessageStatus,
  CommunicationReceiptType,
  InvoiceStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CitizenAccessService } from '../citizen-access.service';
import { EXPERIENCE_INBOX_ITEM_TYPES } from '../constants/experience-action.constants';
import { EXPERIENCE_DEEP_LINK_ROUTES } from '../constants/experience-deep-link-routes.constants';
import { ExperienceInboxItemDto, ExperienceInboxResponseDto } from '../dto/experience-inbox.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { type ResolvedExperienceActor } from '../types/experience-actor-context.types';
import { ExperienceLocalizationContract } from './experience-localization.contract';

const OUTSTANDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

@Injectable()
export class ExperienceInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAccess: CitizenAccessService,
    private readonly localization: ExperienceLocalizationContract,
  ) {}

  async listInbox(
    actor: ResolvedExperienceActor,
    query: PaginationQueryDto,
  ): Promise<ExperienceInboxResponseDto> {
    if (!actor.capabilities.canSearchCitizenResources) {
      return {
        items: [],
        pagination: this.citizenAccess.buildPaginationMeta(
          query.page ?? 1,
          query.pageSize ?? 20,
          0,
        ),
      };
    }

    const scope = await this.citizenAccess.resolveAccessibleScope(actor.identityId);
    const applicationWhere = this.citizenAccess.buildApplicationWhere(scope);
    const caseWhere = this.citizenAccess.buildCaseWhere(scope);

    const applications = await this.prisma.application.findMany({
      where: applicationWhere,
      select: { id: true, case: { select: { id: true } } },
    });
    const caseIds = applications.flatMap((application) =>
      application.case?.id ? [application.case.id] : [],
    );

    const [
      communicationMessages,
      informationRequests,
      invoices,
      expiringInstruments,
      complianceMatters,
      redressMatters,
    ] = await Promise.all([
      caseIds.length > 0
        ? this.prisma.communicationMessage.findMany({
            where: {
              caseId: { in: caseIds },
              status: {
                in: [
                  CommunicationMessageStatus.DELIVERED,
                  CommunicationMessageStatus.PARTIALLY_DELIVERED,
                ],
              },
            },
            include: {
              deliveries: { include: { receipts: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : Promise.resolve([]),
      this.prisma.applicantInformationRequest.findMany({
        where: {
          status: ApplicantInformationRequestStatus.ISSUED,
          respondedAt: null,
          applicationSubmission: { application: applicationWhere },
        },
        include: {
          applicationSubmission: {
            include: {
              application: {
                include: {
                  governmentService: {
                    include: { responsibleInstitution: true, responsibleDepartment: true },
                  },
                },
              },
            },
          },
        },
        take: 25,
      }),
      this.prisma.invoice.findMany({
        where: {
          status: { in: OUTSTANDING_INVOICE_STATUSES },
          case: caseWhere,
        },
        include: {
          case: {
            include: {
              governmentService: {
                include: { responsibleInstitution: true, responsibleDepartment: true },
              },
            },
          },
        },
        take: 25,
      }),
      this.prisma.officialInstrument.findMany({
        where: {
          AND: [
            {
              OR: [{ holderIdentityId: actor.identityId }, { case: caseWhere }],
            },
            {
              status: {
                in: [
                  OfficialInstrumentStatus.ISSUED,
                  OfficialInstrumentStatus.EFFECTIVE,
                  OfficialInstrumentStatus.RENEWED,
                ],
              },
            },
            { effectiveUntil: { not: null } },
          ],
        },
        include: {
          case: {
            include: {
              governmentService: {
                include: { responsibleInstitution: true, responsibleDepartment: true },
              },
            },
          },
        },
        take: 25,
      }),
      this.prisma.complianceMatter.findMany({
        where: {
          OR: [
            { holderIdentityId: actor.identityId },
            ...(scope.representedOrganizationIds.length > 0
              ? [{ holderOrganizationId: { in: scope.representedOrganizationIds } }]
              : []),
          ],
        },
        take: 25,
      }),
      this.prisma.redressMatter.findMany({
        where: {
          appellantIdentityId: actor.identityId,
        },
        take: 25,
      }),
    ]);

    const items: ExperienceInboxItemDto[] = [];
    const seenCommunicationMessageIds = new Set<string>();
    const communicationMessageSubjectsByCase = new Map<string, Set<string>>();

    for (const message of communicationMessages) {
      seenCommunicationMessageIds.add(message.id);
      if (message.caseId) {
        const subjects =
          communicationMessageSubjectsByCase.get(message.caseId) ?? new Set<string>();
        subjects.add(message.subject.toLowerCase());
        communicationMessageSubjectsByCase.set(message.caseId, subjects);
      }
      const read = message.deliveries.some((delivery) =>
        delivery.receipts.some(
          (receipt) => receipt.receiptType === CommunicationReceiptType.LEGAL_ACKNOWLEDGMENT,
        ),
      );

      const itemType = message.decisionNoticeReference
        ? EXPERIENCE_INBOX_ITEM_TYPES.DECISION_NOTICE
        : EXPERIENCE_INBOX_ITEM_TYPES.SECURE_GOVERNMENT_MESSAGE;

      items.push({
        inboxItemId: `communication-message:${message.id}`,
        itemType,
        sourceDomain: 'operational_support',
        sourceRecordId: message.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: message.subject,
            labelKey: `experience.inbox.${itemType}.title`,
          },
          actor.locale,
        ),
        preview: this.localization.buildLabel(
          {
            defaultLabel: message.messageReference,
            labelKey: 'experience.inbox.message.preview',
          },
          actor.locale,
        ),
        receivedAt: message.approvedAt?.toISOString() ?? message.createdAt.toISOString(),
        read,
        deepLink: {
          route: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_MESSAGE_DETAIL,
          params: { messageId: message.id },
        },
      });
    }

    for (const request of informationRequests) {
      const application = request.applicationSubmission.application;
      items.push({
        inboxItemId: `information-request:${request.id}`,
        itemType: EXPERIENCE_INBOX_ITEM_TYPES.REQUEST_FOR_INFORMATION,
        sourceDomain: 'application_processing',
        sourceRecordId: request.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: 'Request for information',
            labelKey: 'experience.inbox.request_for_information.title',
          },
          actor.locale,
        ),
        preview: this.localization.buildLabel(
          {
            defaultLabel: application.applicationNumber ?? application.id,
            labelKey: 'experience.inbox.request_for_information.preview',
          },
          actor.locale,
        ),
        receivedAt: request.issuedAt.toISOString(),
        read: false,
        deepLink: {
          route: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_APPLICATION_DETAIL,
          params: { applicationId: application.id },
        },
        attribution: this.mapAttribution(application),
      });
    }

    for (const invoice of invoices) {
      items.push({
        inboxItemId: `invoice:${invoice.id}`,
        itemType: EXPERIENCE_INBOX_ITEM_TYPES.PAYMENT_NOTICE,
        sourceDomain: 'operational_support',
        sourceRecordId: invoice.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: `Payment notice ${invoice.invoiceNumber}`,
            labelKey: 'experience.inbox.payment_notice.title',
          },
          actor.locale,
        ),
        receivedAt: invoice.issuedAt?.toISOString() ?? invoice.createdAt.toISOString(),
        read: false,
        deepLink: {
          route: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_PAYMENT_INVOICE,
          params: { invoiceId: invoice.id },
        },
        attribution: invoice.case ? this.mapAttribution(invoice.case) : undefined,
      });
    }

    for (const instrument of expiringInstruments) {
      if (!instrument.effectiveUntil) {
        continue;
      }

      items.push({
        inboxItemId: `renewal:${instrument.id}`,
        itemType: EXPERIENCE_INBOX_ITEM_TYPES.RENEWAL_NOTICE,
        sourceDomain: 'decisions_issuance',
        sourceRecordId: instrument.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: `Renewal notice: ${instrument.instrumentNumber ?? instrument.id}`,
            labelKey: 'experience.inbox.renewal_notice.title',
          },
          actor.locale,
        ),
        receivedAt: instrument.updatedAt.toISOString(),
        read: false,
        deepLink: {
          route: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_INSTRUMENT_DETAIL,
          params: { instrumentId: instrument.id },
        },
        attribution: instrument.case ? this.mapAttribution(instrument.case) : undefined,
      });
    }

    for (const matter of complianceMatters) {
      items.push({
        inboxItemId: `compliance:${matter.id}`,
        itemType: EXPERIENCE_INBOX_ITEM_TYPES.COMPLIANCE_MESSAGE,
        sourceDomain: 'compliance',
        sourceRecordId: matter.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: matter.complianceMatterNumber,
            labelKey: 'experience.inbox.compliance_message.title',
          },
          actor.locale,
        ),
        receivedAt: matter.openedAt.toISOString(),
        read: false,
        deepLink: {
          route: 'citizen.compliance.detail',
          params: { complianceMatterId: matter.id },
        },
      });
    }

    for (const redressMatter of redressMatters) {
      items.push({
        inboxItemId: `redress:${redressMatter.id}`,
        itemType: EXPERIENCE_INBOX_ITEM_TYPES.APPEAL_REDRESS_MESSAGE,
        sourceDomain: 'redress',
        sourceRecordId: redressMatter.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: redressMatter.redressMatterNumber,
            labelKey: 'experience.inbox.appeal_redress_message.title',
          },
          actor.locale,
        ),
        receivedAt: redressMatter.filedAt.toISOString(),
        read: false,
        deepLink: {
          route: 'citizen.redress.detail',
          params: { redressMatterId: redressMatter.id },
        },
      });
    }

    const caseCommunications =
      caseIds.length > 0
        ? await this.prisma.caseCommunication.findMany({
            where: {
              caseId: { in: caseIds },
              publicVisibility: 'APPLICANT_VISIBLE',
              deliveryStatus: 'SENT',
            },
            orderBy: { sentAt: 'desc' },
            take: 25,
          })
        : [];

    for (const communication of caseCommunications) {
      if (
        this.caseCommunicationDuplicatesMessage(communication, communicationMessageSubjectsByCase)
      ) {
        continue;
      }

      items.push({
        inboxItemId: `case-communication:${communication.id}`,
        itemType: EXPERIENCE_INBOX_ITEM_TYPES.APPOINTMENT_UPDATE,
        sourceDomain: 'application_processing',
        sourceRecordId: communication.id,
        title: this.localization.buildLabel(
          {
            defaultLabel: communication.subject ?? 'Case update',
            labelKey: 'experience.inbox.appointment_update.title',
          },
          actor.locale,
        ),
        receivedAt: communication.sentAt?.toISOString() ?? communication.createdAt.toISOString(),
        read: false,
        deepLink: {
          route: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_CASE_MESSAGES,
          params: { caseId: communication.caseId },
        },
      });
    }

    items.sort((left, right) => Date.parse(right.receivedAt) - Date.parse(left.receivedAt));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      pagination: this.citizenAccess.buildPaginationMeta(page, pageSize, items.length),
    };
  }

  private caseCommunicationDuplicatesMessage(
    communication: { subject: string | null; caseId: string },
    messageSubjectsByCase: Map<string, Set<string>>,
  ): boolean {
    if (!communication.subject) {
      return false;
    }

    const subjects = messageSubjectsByCase.get(communication.caseId);
    return subjects?.has(communication.subject.toLowerCase()) ?? false;
  }

  private mapAttribution(source: {
    governmentService?: {
      slug: string;
      publicName?: string;
      responsibleInstitution: { id: string; code: string; name: string };
      responsibleDepartment?: { id: string; name: string } | null;
    } | null;
  }) {
    const service = source.governmentService;
    if (!service) {
      return undefined;
    }

    return {
      institutionId: service.responsibleInstitution.id,
      institutionCode: service.responsibleInstitution.code,
      institutionName: service.responsibleInstitution.name,
      departmentId: service.responsibleDepartment?.id,
      departmentName: service.responsibleDepartment?.name,
      serviceSlug: service.slug,
      serviceName: service.publicName ?? service.slug,
    };
  }
}
