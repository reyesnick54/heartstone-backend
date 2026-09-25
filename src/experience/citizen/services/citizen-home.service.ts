import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  AppointmentParticipantRole,
  CaseEventPublicVisibility,
  CaseStatus,
  GovernmentServicePublicAvailability,
  InvoiceStatus,
  OfficialInstrumentStatus,
  ServiceAppointmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ACTIVE_REDRESS_MATTER_STATUSES } from '../../../redress/common/active-redress-matter-statuses.constants';
import { CitizenAccessService } from '../../common/citizen-access.service';
import { type CitizenHomeResponseDto } from '../dto/citizen-home-response.dto';

const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.RECEIVED,
];

const OUTSTANDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

const PENDING_GOVERNMENT_CASE_STATUSES: CaseStatus[] = [
  CaseStatus.PENDING_EXTERNAL,
  CaseStatus.PENDING_INTERNAL,
  CaseStatus.REFERRAL_PENDING,
  CaseStatus.PROFESSIONAL_REVIEW,
  CaseStatus.INSPECTION,
];

@Injectable()
export class CitizenHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CitizenAccessService,
  ) {}

  async getHome(identityId: string): Promise<CitizenHomeResponseDto> {
    const scope = await this.access.resolveAccessibleScope(identityId);
    const caseWhere = this.access.buildCaseWhere(scope);
    const applicationWhere = this.access.buildApplicationWhere(scope);
    const now = new Date();
    const expirationHorizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const accessibleCaseIds = await this.prisma.case.findMany({
      where: caseWhere,
      select: { id: true },
    });
    const caseIds = accessibleCaseIds.map((caseRecord) => caseRecord.id);

    const [
      activeApplications,
      actionRequiredCases,
      pendingGovernmentRequests,
      recentDecisions,
      issuedCredentials,
      outstandingPayments,
      upcomingExpirations,
      unreadMessages,
      appealsRedressMatters,
      upcomingAppointments,
      recentCases,
      appliedServiceIds,
    ] = await Promise.all([
      this.prisma.application.count({
        where: {
          ...applicationWhere,
          status: { in: ACTIVE_APPLICATION_STATUSES },
        },
      }),
      this.prisma.case.count({
        where: {
          ...caseWhere,
          status: CaseStatus.WAITING_APPLICANT,
        },
      }),
      this.prisma.case.count({
        where: {
          ...caseWhere,
          status: { in: PENDING_GOVERNMENT_CASE_STATUSES },
        },
      }),
      caseIds.length === 0
        ? Promise.resolve(0)
        : this.prisma.governmentDecision.count({
            where: {
              caseId: { in: caseIds },
              decidedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
            },
          }),
      this.prisma.officialInstrument.count({
        where: {
          OR: [
            { holderIdentityId: identityId },
            ...(caseIds.length > 0 ? [{ caseId: { in: caseIds } }] : []),
          ],
          status: {
            in: [
              OfficialInstrumentStatus.ISSUED,
              OfficialInstrumentStatus.EFFECTIVE,
              OfficialInstrumentStatus.RENEWED,
            ],
          },
        },
      }),
      caseIds.length === 0
        ? Promise.resolve(0)
        : this.prisma.invoice.count({
            where: {
              caseId: { in: caseIds },
              status: { in: OUTSTANDING_INVOICE_STATUSES },
            },
          }),
      this.prisma.officialInstrument.count({
        where: {
          OR: [
            { holderIdentityId: identityId },
            ...(caseIds.length > 0 ? [{ caseId: { in: caseIds } }] : []),
          ],
          effectiveUntil: { gte: now, lte: expirationHorizon },
          status: {
            in: [
              OfficialInstrumentStatus.ISSUED,
              OfficialInstrumentStatus.EFFECTIVE,
              OfficialInstrumentStatus.RENEWED,
            ],
          },
        },
      }),
      caseIds.length === 0
        ? Promise.resolve(0)
        : this.prisma.caseCommunication.count({
            where: {
              caseId: { in: caseIds },
              publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
              deliveryStatus: 'SENT',
            },
          }),
      this.prisma.redressMatter.count({
        where: {
          appellantIdentityId: identityId,
          status: { in: [...ACTIVE_REDRESS_MATTER_STATUSES] },
        },
      }),
      this.prisma.serviceAppointment.count({
        where: {
          participants: {
            some: {
              identityId,
              role: {
                in: [
                  AppointmentParticipantRole.APPLICANT,
                  AppointmentParticipantRole.REPRESENTATIVE,
                ],
              },
            },
          },
          status: {
            in: [
              ServiceAppointmentStatus.REQUESTED,
              ServiceAppointmentStatus.SCHEDULED,
              ServiceAppointmentStatus.CONFIRMED,
              ServiceAppointmentStatus.RESCHEDULED,
            ],
          },
          scheduledStartsAt: { gte: now },
        },
      }),
      this.prisma.case.findMany({
        where: caseWhere,
        include: {
          governmentService: {
            include: {
              responsibleInstitution: true,
              responsibleDepartment: true,
            },
          },
          publicStatusProjection: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: 5,
      }),
      this.prisma.application.findMany({
        where: applicationWhere,
        select: { governmentServiceId: true },
        distinct: ['governmentServiceId'],
      }),
    ]);

    const appliedIds = appliedServiceIds.map((application) => application.governmentServiceId);
    const serviceRecommendations =
      appliedIds.length === 0 ? [] : await this.buildServiceRecommendations(appliedIds, appliedIds);

    const actionRequired =
      actionRequiredCases +
      (caseIds.length === 0
        ? 0
        : await this.prisma.invoice.count({
            where: {
              caseId: { in: caseIds },
              status: { in: OUTSTANDING_INVOICE_STATUSES },
            },
          }));

    return {
      counts: {
        activeApplications,
        actionRequired,
        pendingGovernmentRequests,
        recentDecisions,
        issuedCredentials,
        outstandingPayments,
        upcomingExpirations,
        unreadMessages,
        appealsRedressMatters,
        upcomingAppointments,
      },
      recentItems: recentCases.map((caseRecord) => ({
        itemType: 'CASE',
        itemId: caseRecord.id,
        title: caseRecord.publicStatusProjection?.publicStatusLabel ?? 'Application in progress',
        occurredAt: caseRecord.updatedAt.toISOString(),
        attribution: {
          institutionId: caseRecord.governmentService.responsibleInstitution.id,
          institutionCode: caseRecord.governmentService.responsibleInstitution.code,
          institutionName: caseRecord.governmentService.responsibleInstitution.name,
          departmentId: caseRecord.governmentService.responsibleDepartment.id,
          departmentName: caseRecord.governmentService.responsibleDepartment.name,
          serviceId: caseRecord.governmentService.id,
          serviceSlug: caseRecord.governmentService.slug,
          serviceName: caseRecord.governmentService.publicName,
        },
      })),
      serviceRecommendations,
      disclaimer: {
        label:
          'Home summaries exclude internal officer notes, restricted evidence, and security-sensitive records.',
        labelKey: 'citizen.home.disclaimer',
      },
    };
  }

  private async buildServiceRecommendations(
    sourceServiceIds: string[],
    excludeServiceIds: string[],
  ) {
    const sourceServices = await this.prisma.governmentService.findMany({
      where: { id: { in: sourceServiceIds } },
      select: { serviceFamilyId: true },
    });

    const familyIds = [
      ...new Set(sourceServices.map((service) => service.serviceFamilyId).filter(Boolean)),
    ] as string[];

    if (familyIds.length === 0) {
      return [];
    }

    const candidates = await this.prisma.governmentService.findMany({
      where: {
        serviceFamilyId: { in: familyIds },
        id: { notIn: excludeServiceIds },
        versions: {
          some: {
            publicAvailability: {
              in: [
                GovernmentServicePublicAvailability.ACTIVE,
                GovernmentServicePublicAvailability.INFORMATION_ONLY,
              ],
            },
          },
        },
      },
      orderBy: [{ publicName: 'asc' }, { id: 'asc' }],
      take: 3,
    });

    return candidates.map((service) => ({
      serviceId: service.id,
      serviceSlug: service.slug,
      publicName: service.publicName,
      recommendationReason: {
        label: 'Related service you may be interested in',
        labelKey: 'citizen.home.recommendation.related_service',
      },
    }));
  }
}
