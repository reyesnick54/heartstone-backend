import { Injectable } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  ApplicationStatus,
  CaseStatus,
  ComplianceMatterStatus,
  ContinuingObligationStatus,
  DeficiencyNoticeStatus,
  InvoiceStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { mapInstitutionAttribution } from '../../citizen/mappers/citizen-attribution.mapper';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  BUSINESS_ACTION_CODES,
  BUSINESS_ACTION_LABELS,
  type BusinessActionCode,
} from '../constants/business-action-codes';
import {
  type BusinessActionDto,
  type BusinessActionsResponseDto,
} from '../dto/business-action.dto';

const OUTSTANDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

const OUTSTANDING_OBLIGATION_STATUSES: ContinuingObligationStatus[] = [
  ContinuingObligationStatus.DUE,
  ContinuingObligationStatus.OVERDUE,
  ContinuingObligationStatus.DISPUTED,
];

@Injectable()
export class BusinessActionCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listActions(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessActionsResponseDto> {
    const orgAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const applicationWhere = this.access.buildApplicationWhere(orgAccess);
    const caseWhere = this.access.buildCaseWhere(orgAccess);
    const now = new Date();
    const expirationHorizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      waitingCases,
      draftApplications,
      outstandingInvoices,
      openRequests,
      expiringInstruments,
      outstandingObligations,
      correctiveActionMatters,
      applicantMessages,
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
          applicationSubmission: { application: applicationWhere },
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
          holderOrganizationId: organizationId,
          effectiveUntil: { gte: now, lte: expirationHorizon },
          status: {
            in: [
              OfficialInstrumentStatus.ISSUED,
              OfficialInstrumentStatus.EFFECTIVE,
              OfficialInstrumentStatus.RENEWED,
            ],
          },
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
      this.prisma.continuingObligation.findMany({
        where: {
          status: { in: OUTSTANDING_OBLIGATION_STATUSES },
          complianceMatter: { holderOrganizationId: organizationId },
        },
        include: {
          complianceMatter: {
            include: {
              case: {
                include: {
                  governmentService: {
                    include: { responsibleInstitution: true, responsibleDepartment: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.complianceMatter.findMany({
        where: {
          holderOrganizationId: organizationId,
          status: ComplianceMatterStatus.CORRECTIVE_ACTION,
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
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.caseCommunication.findMany({
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
      }),
    ]);

    const deficiencyNotices = await this.prisma.deficiencyNotice.findMany({
      where: {
        status: DeficiencyNoticeStatus.ISSUED,
        respondedAt: null,
        applicationSubmission: { application: applicationWhere },
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

    const actions: BusinessActionDto[] = [];

    for (const caseRecord of waitingCases) {
      actions.push(
        this.buildAction({
          actionCode: BUSINESS_ACTION_CODES.PROVIDE_MISSING_INFORMATION,
          priority: 10,
          dueAt: null,
          createdAt: caseRecord.updatedAt,
          attribution: mapInstitutionAttribution(caseRecord),
          deepLink: {
            route: 'business.case.status',
            params: { organizationId, caseId: caseRecord.id },
          },
          relatedCaseId: caseRecord.id,
          relatedApplicationId: caseRecord.applicationId,
        }),
      );
    }

    for (const application of draftApplications) {
      actions.push(
        this.buildAction({
          actionCode: BUSINESS_ACTION_CODES.COMPLETE_DRAFT_APPLICATION,
          priority: 20,
          dueAt: null,
          createdAt: application.updatedAt,
          attribution: mapInstitutionAttribution(application),
          deepLink: {
            route: 'business.application.detail',
            params: { organizationId, applicationId: application.id },
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
          actionCode: BUSINESS_ACTION_CODES.PAY_INVOICE,
          priority: 5,
          dueAt: invoice.dueAt,
          createdAt: invoice.issuedAt ?? invoice.createdAt,
          attribution: mapInstitutionAttribution(invoice.case),
          deepLink: {
            route: 'business.payment.invoice',
            params: { organizationId, invoiceId: invoice.id },
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
          actionCode: BUSINESS_ACTION_CODES.SUBMIT_REQUESTED_INFORMATION,
          priority: 8,
          dueAt: request.expiresAt,
          createdAt: request.issuedAt,
          attribution: mapInstitutionAttribution(application),
          deepLink: {
            route: 'business.application.detail',
            params: { organizationId, applicationId: application.id },
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
          actionCode: BUSINESS_ACTION_CODES.PROVIDE_MISSING_INFORMATION,
          priority: 9,
          dueAt: null,
          createdAt: notice.issuedAt,
          attribution: mapInstitutionAttribution(application),
          deepLink: {
            route: 'business.application.detail',
            params: { organizationId, applicationId: application.id },
          },
          relatedApplicationId: application.id,
          relatedCaseId: application.case?.id,
        }),
      );
    }

    for (const instrument of expiringInstruments) {
      const attributionSource = instrument.case;
      if (!attributionSource) {
        continue;
      }

      actions.push(
        this.buildAction({
          actionCode: BUSINESS_ACTION_CODES.RENEW_LICENSE,
          priority: 15,
          dueAt: instrument.effectiveUntil,
          createdAt: instrument.updatedAt,
          attribution: mapInstitutionAttribution(attributionSource),
          deepLink: {
            route: 'business.instrument.detail',
            params: { organizationId, instrumentId: instrument.id },
          },
          relatedCaseId: instrument.caseId ?? undefined,
          relatedInstrumentId: instrument.id,
        }),
      );
    }

    for (const obligation of outstandingObligations) {
      const attributionSource = obligation.complianceMatter.case;
      actions.push(
        this.buildAction({
          actionCode: BUSINESS_ACTION_CODES.SATISFY_COMPLIANCE_OBLIGATION,
          priority: 7,
          dueAt: obligation.dueDate,
          createdAt: obligation.updatedAt,
          attribution: attributionSource
            ? mapInstitutionAttribution(attributionSource)
            : {
                institutionId: obligation.complianceMatter.responsibleInstitutionId,
                institutionCode: '',
                institutionName: 'Compliance authority',
              },
          deepLink: {
            route: 'business.compliance.obligation',
            params: {
              organizationId,
              complianceMatterId: obligation.complianceMatterId,
              obligationId: obligation.id,
            },
          },
          relatedComplianceMatterId: obligation.complianceMatterId,
        }),
      );
    }

    for (const matter of correctiveActionMatters) {
      if (!matter.case) {
        continue;
      }

      actions.push(
        this.buildAction({
          actionCode: BUSINESS_ACTION_CODES.RESPOND_TO_CORRECTIVE_ACTION,
          priority: 6,
          dueAt: null,
          createdAt: matter.updatedAt,
          attribution: mapInstitutionAttribution(matter.case),
          deepLink: {
            route: 'business.compliance.matter',
            params: { organizationId, complianceMatterId: matter.id },
          },
          relatedComplianceMatterId: matter.id,
          relatedCaseId: matter.caseId ?? undefined,
        }),
      );
    }

    for (const communication of applicantMessages) {
      actions.push(
        this.buildAction({
          actionCode:
            communication.communicationType === 'DEFICIENCY_NOTICE'
              ? BUSINESS_ACTION_CODES.RESPOND_TO_INSPECTION_REQUIREMENT
              : BUSINESS_ACTION_CODES.RESPOND_TO_GOVERNMENT_CORRESPONDENCE,
          priority: 12,
          dueAt: null,
          createdAt: communication.sentAt ?? communication.createdAt,
          attribution: mapInstitutionAttribution(communication.case),
          deepLink: {
            route: 'business.case.messages',
            params: {
              organizationId,
              caseId: communication.caseId,
              communicationId: communication.id,
            },
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
    actionCode: BusinessActionCode;
    priority: number;
    dueAt: Date | null | undefined;
    createdAt: Date;
    attribution: BusinessActionDto['attribution'];
    deepLink: BusinessActionDto['deepLink'];
    relatedCaseId?: string;
    relatedApplicationId?: string;
    relatedInvoiceId?: string;
    relatedInstrumentId?: string;
    relatedCommunicationId?: string;
    relatedComplianceMatterId?: string;
    relatedProjectId?: string;
  }): BusinessActionDto {
    const labelMeta = BUSINESS_ACTION_LABELS[input.actionCode];
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
      relatedComplianceMatterId: input.relatedComplianceMatterId,
      relatedProjectId: input.relatedProjectId,
    };
  }
}
