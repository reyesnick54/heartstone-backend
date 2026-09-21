import { Injectable } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  ApplicationStatus,
  CaseStatus,
  DeficiencyNoticeStatus,
  InvoiceStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CitizenAccessService } from '../../common/citizen-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  CITIZEN_ACTION_CODES,
  CITIZEN_ACTION_LABELS,
  type CitizenActionCode,
} from '../constants/citizen-action-codes';
import { type CitizenActionDto, type CitizenActionsResponseDto } from '../dto/citizen-action.dto';
import { mapInstitutionAttribution } from '../mappers/citizen-attribution.mapper';

const OUTSTANDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

@Injectable()
export class CitizenActionCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CitizenAccessService,
  ) {}

  async listActions(
    identityId: string,
    query: PaginationQueryDto,
  ): Promise<CitizenActionsResponseDto> {
    const scope = await this.access.resolveAccessibleScope(identityId);
    const caseWhere = this.access.buildCaseWhere(scope);
    const applicationWhere = this.access.buildApplicationWhere(scope);
    const now = new Date();
    const expirationHorizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      waitingCases,
      draftApplications,
      outstandingInvoices,
      openRequests,
      expiringInstruments,
    ] = await Promise.all([
      this.prisma.case.findMany({
        where: { ...caseWhere, status: CaseStatus.WAITING_APPLICANT },
        include: {
          governmentService: {
            include: { responsibleInstitution: true, responsibleDepartment: true },
          },
          application: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.application.findMany({
        where: { ...applicationWhere, status: ApplicationStatus.DRAFT },
        include: {
          governmentService: {
            include: { responsibleInstitution: true, responsibleDepartment: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
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
              application: true,
            },
          },
        },
        orderBy: [{ dueAt: 'asc' }, { issuedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.applicantInformationRequest.findMany({
        where: {
          status: ApplicantInformationRequestStatus.ISSUED,
          respondedAt: null,
          applicationSubmission: {
            application: applicationWhere,
          },
        },
        include: {
          applicationSubmission: {
            include: {
              application: {
                include: {
                  case: true,
                  governmentService: {
                    include: { responsibleInstitution: true, responsibleDepartment: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.officialInstrument.findMany({
        where: {
          effectiveUntil: { gte: now, lte: expirationHorizon },
          status: {
            in: [
              OfficialInstrumentStatus.ISSUED,
              OfficialInstrumentStatus.EFFECTIVE,
              OfficialInstrumentStatus.RENEWED,
            ],
          },
          OR: [{ holderIdentityId: identityId }, { case: caseWhere }],
        },
        include: {
          case: {
            include: {
              governmentService: {
                include: { responsibleInstitution: true, responsibleDepartment: true },
              },
              application: true,
            },
          },
        },
        orderBy: [{ effectiveUntil: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const deficiencyNotices = await this.prisma.deficiencyNotice.findMany({
      where: {
        status: DeficiencyNoticeStatus.ISSUED,
        respondedAt: null,
        applicationSubmission: {
          application: applicationWhere,
        },
      },
      include: {
        applicationSubmission: {
          include: {
            application: {
              include: {
                case: true,
                governmentService: {
                  include: { responsibleInstitution: true, responsibleDepartment: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
    });

    const applicantMessages = await this.prisma.caseCommunication.findMany({
      where: {
        case: caseWhere,
        publicVisibility: 'APPLICANT_VISIBLE',
        communicationType: {
          in: ['DEFICIENCY_NOTICE', 'REQUEST_FOR_INFORMATION', 'STATUS_UPDATE', 'SYSTEM_NOTICE'],
        },
        deliveryStatus: 'SENT',
      },
      include: {
        case: {
          include: {
            governmentService: {
              include: { responsibleInstitution: true, responsibleDepartment: true },
            },
            application: true,
          },
        },
      },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: 20,
    });

    const actions: CitizenActionDto[] = [];

    for (const caseRecord of waitingCases) {
      actions.push(
        this.buildAction({
          actionCode: CITIZEN_ACTION_CODES.PROVIDE_MISSING_INFORMATION,
          priority: 10,
          dueAt: null,
          createdAt: caseRecord.updatedAt,
          attribution: mapInstitutionAttribution(caseRecord),
          deepLink: {
            route: 'citizen.case.status',
            params: { caseId: caseRecord.id },
          },
          relatedCaseId: caseRecord.id,
          relatedApplicationId: caseRecord.applicationId,
        }),
      );
    }

    for (const application of draftApplications) {
      actions.push(
        this.buildAction({
          actionCode: CITIZEN_ACTION_CODES.COMPLETE_DRAFT_APPLICATION,
          priority: 20,
          dueAt: null,
          createdAt: application.updatedAt,
          attribution: mapInstitutionAttribution(application),
          deepLink: {
            route: 'citizen.application.detail',
            params: { applicationId: application.id },
          },
          relatedApplicationId: application.id,
        }),
      );
    }

    for (const invoice of outstandingInvoices) {
      if (!invoice.case) {
        continue;
      }

      actions.push(
        this.buildAction({
          actionCode: CITIZEN_ACTION_CODES.PAY_INVOICE,
          priority: 5,
          dueAt: invoice.dueAt,
          createdAt: invoice.issuedAt ?? invoice.createdAt,
          attribution: mapInstitutionAttribution(invoice.case),
          deepLink: {
            route: 'citizen.payment.invoice',
            params: { invoiceId: invoice.id },
          },
          relatedCaseId: invoice.caseId ?? undefined,
          relatedApplicationId: invoice.case.applicationId,
          relatedInvoiceId: invoice.id,
        }),
      );
    }

    for (const request of openRequests) {
      const application = request.applicationSubmission.application;
      actions.push(
        this.buildAction({
          actionCode: CITIZEN_ACTION_CODES.RESPOND_TO_REQUEST,
          priority: 8,
          dueAt: request.expiresAt,
          createdAt: request.issuedAt,
          attribution: mapInstitutionAttribution(application),
          deepLink: {
            route: 'citizen.application.detail',
            params: { applicationId: application.id },
          },
          relatedApplicationId: application.id,
          relatedCaseId: application.case?.id,
        }),
      );
    }

    for (const notice of deficiencyNotices) {
      const application = notice.applicationSubmission.application;
      actions.push(
        this.buildAction({
          actionCode: CITIZEN_ACTION_CODES.PROVIDE_MISSING_INFORMATION,
          priority: 9,
          dueAt: null,
          createdAt: notice.issuedAt,
          attribution: mapInstitutionAttribution(application),
          deepLink: {
            route: 'citizen.application.detail',
            params: { applicationId: application.id },
          },
          relatedApplicationId: application.id,
          relatedCaseId: application.case?.id,
        }),
      );
    }

    for (const instrument of expiringInstruments) {
      const attributionSource = instrument.case ?? null;
      if (!attributionSource) {
        continue;
      }

      actions.push(
        this.buildAction({
          actionCode: CITIZEN_ACTION_CODES.RENEW_INSTRUMENT,
          priority: 15,
          dueAt: instrument.effectiveUntil,
          createdAt: instrument.updatedAt,
          attribution: mapInstitutionAttribution(attributionSource),
          deepLink: {
            route: 'citizen.instrument.detail',
            params: { instrumentId: instrument.id },
          },
          relatedCaseId: instrument.caseId ?? undefined,
          relatedInstrumentId: instrument.id,
        }),
      );
    }

    for (const communication of applicantMessages) {
      actions.push(
        this.buildAction({
          actionCode:
            communication.communicationType === 'DEFICIENCY_NOTICE'
              ? CITIZEN_ACTION_CODES.ACKNOWLEDGE_NOTICE
              : CITIZEN_ACTION_CODES.REVIEW_GOVERNMENT_MESSAGE,
          priority: 12,
          dueAt: null,
          createdAt: communication.sentAt ?? communication.createdAt,
          attribution: mapInstitutionAttribution(communication.case),
          deepLink: {
            route: 'citizen.case.messages',
            params: { caseId: communication.caseId, communicationId: communication.id },
          },
          relatedCaseId: communication.caseId,
          relatedApplicationId: communication.case.applicationId,
          relatedCommunicationId: communication.id,
        }),
      );
    }

    actions.sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      const leftDue = left.dueAt ? Date.parse(left.dueAt) : Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueAt ? Date.parse(right.dueAt) : Number.MAX_SAFE_INTEGER;
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const pagedItems = actions.slice(start, start + pageSize);

    return {
      items: pagedItems,
      pagination: this.access.buildPaginationMeta(page, pageSize, actions.length),
    };
  }

  private buildAction(input: {
    actionCode: CitizenActionCode;
    priority: number;
    dueAt: Date | null | undefined;
    createdAt: Date;
    attribution: CitizenActionDto['attribution'];
    deepLink: CitizenActionDto['deepLink'];
    relatedCaseId?: string;
    relatedApplicationId?: string;
    relatedInvoiceId?: string;
    relatedInstrumentId?: string;
    relatedCommunicationId?: string;
  }): CitizenActionDto {
    const labelMeta = CITIZEN_ACTION_LABELS[input.actionCode];
    return {
      actionCode: input.actionCode,
      label: {
        label: labelMeta.label,
        labelKey: labelMeta.labelKey,
      },
      priority: input.priority,
      dueAt: input.dueAt?.toISOString() ?? null,
      createdAt: input.createdAt.toISOString(),
      attribution: input.attribution,
      deepLink: input.deepLink,
      relatedCaseId: input.relatedCaseId,
      relatedApplicationId: input.relatedApplicationId,
      relatedInvoiceId: input.relatedInvoiceId,
      relatedInstrumentId: input.relatedInstrumentId,
      relatedCommunicationId: input.relatedCommunicationId,
    };
  }
}
