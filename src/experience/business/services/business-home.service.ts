import { Injectable } from '@nestjs/common';
import {
  ApplicantCategory,
  ApplicationStatus,
  CaseEventPublicVisibility,
  CaseStatus,
  ComplianceMatterStatus,
  ContinuingObligationStatus,
  InvoiceStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { mapInstitutionAttribution } from '../../citizen/mappers/citizen-attribution.mapper';
import { BusinessAccessService } from '../../common/business-access.service';
import { type BusinessHomeResponseDto } from '../dto/business-home-response.dto';

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

const ACTIVE_INSTRUMENT_STATUSES: OfficialInstrumentStatus[] = [
  OfficialInstrumentStatus.ISSUED,
  OfficialInstrumentStatus.EFFECTIVE,
  OfficialInstrumentStatus.RENEWED,
];

const OUTSTANDING_OBLIGATION_STATUSES: ContinuingObligationStatus[] = [
  ContinuingObligationStatus.NOT_YET_DUE,
  ContinuingObligationStatus.DUE,
  ContinuingObligationStatus.SUBMITTED,
  ContinuingObligationStatus.UNDER_REVIEW,
  ContinuingObligationStatus.OVERDUE,
  ContinuingObligationStatus.DISPUTED,
];

const WORKFORCE_CATEGORIES: ApplicantCategory[] = [
  ApplicantCategory.EMPLOYER,
  ApplicantCategory.EMPLOYEE,
];

@Injectable()
export class BusinessHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async getHome(identityId: string, organizationId: string): Promise<BusinessHomeResponseDto> {
    const orgAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const applicationWhere = this.access.buildApplicationWhere(orgAccess);
    const caseWhere = this.access.buildCaseWhere(orgAccess);
    const now = new Date();
    const expirationHorizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const accessibleCases = await this.prisma.case.findMany({
      where: caseWhere,
      select: { id: true },
    });
    const caseIds = accessibleCases.map((caseRecord) => caseRecord.id);

    const [
      activeApplications,
      activeLicenses,
      licensesApproachingExpiry,
      actionRequiredCases,
      outstandingPayments,
      governmentMessages,
      complianceObligations,
      inspectionsAndCorrectiveActions,
      workforceMatters,
      strategicInvestmentProjects,
      recentCases,
    ] = await Promise.all([
      this.prisma.application.count({
        where: { ...applicationWhere, status: { in: ACTIVE_APPLICATION_STATUSES } },
      }),
      this.prisma.officialInstrument.count({
        where: {
          holderOrganizationId: organizationId,
          status: { in: ACTIVE_INSTRUMENT_STATUSES },
        },
      }),
      this.prisma.officialInstrument.count({
        where: {
          holderOrganizationId: organizationId,
          status: { in: ACTIVE_INSTRUMENT_STATUSES },
          effectiveUntil: { gte: now, lte: expirationHorizon },
        },
      }),
      this.prisma.case.count({
        where: { ...caseWhere, status: CaseStatus.WAITING_APPLICANT },
      }),
      caseIds.length === 0
        ? Promise.resolve(0)
        : this.prisma.invoice.count({
            where: {
              caseId: { in: caseIds },
              status: { in: OUTSTANDING_INVOICE_STATUSES },
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
      this.prisma.continuingObligation.count({
        where: {
          status: { in: OUTSTANDING_OBLIGATION_STATUSES },
          complianceMatter: { holderOrganizationId: organizationId },
        },
      }),
      this.prisma.complianceMatter.count({
        where: {
          holderOrganizationId: organizationId,
          status: {
            in: [
              ComplianceMatterStatus.INSPECTION_REQUIRED,
              ComplianceMatterStatus.CORRECTIVE_ACTION,
            ],
          },
        },
      }),
      this.prisma.application.count({
        where: {
          ...applicationWhere,
          applicantCategory: { in: WORKFORCE_CATEGORIES },
          status: { in: ACTIVE_APPLICATION_STATUSES },
        },
      }),
      caseIds.length === 0
        ? Promise.resolve(0)
        : this.prisma.strategicProjectProfile.count({
            where: { caseId: { in: caseIds } },
          }),
      this.prisma.case.findMany({
        where: caseWhere,
        include: {
          governmentService: {
            include: { responsibleInstitution: true, responsibleDepartment: true },
          },
          publicStatusProjection: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: 5,
      }),
    ]);

    const propertyAndProjectMatters = strategicInvestmentProjects;
    const customsAndTradeMatters = 0;
    const appealsAndRedress = 0;
    const upcomingDeadlines =
      licensesApproachingExpiry +
      (await this.prisma.continuingObligation.count({
        where: {
          status: { in: [ContinuingObligationStatus.DUE, ContinuingObligationStatus.OVERDUE] },
          complianceMatter: { holderOrganizationId: organizationId },
          dueDate: { lte: expirationHorizon },
        },
      }));

    const outstandingActions = actionRequiredCases + outstandingPayments;

    return {
      organizationId,
      counts: {
        activeApplications,
        activeLicenses,
        licensesApproachingExpiry,
        outstandingActions,
        outstandingPayments,
        governmentMessages,
        complianceObligations,
        inspectionsAndCorrectiveActions,
        workforceMatters,
        propertyAndProjectMatters,
        customsAndTradeMatters,
        strategicInvestmentProjects,
        appealsAndRedress,
        upcomingDeadlines,
      },
      recentItems: recentCases.map((caseRecord) => ({
        itemType: 'CASE',
        itemId: caseRecord.id,
        title: caseRecord.publicStatusProjection?.publicStatusLabel ?? 'Application in progress',
        occurredAt: caseRecord.updatedAt.toISOString(),
        attribution: mapInstitutionAttribution(caseRecord),
      })),
      disclaimer: {
        label:
          'Business home summaries exclude internal government deliberation, restricted evidence, officer-only notes, and security-sensitive data.',
        labelKey: 'business.home.disclaimer',
      },
    };
  }
}
