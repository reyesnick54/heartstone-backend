import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomsAssessmentStatus,
  CustomsDeclarationStatus,
  CustomsHoldStatus,
  TradeAccessActorKind,
  TradeShipmentStatus,
} from '@prisma/client';

import { CustomsTradeAccessService } from '../../../customs-trade/common/customs-trade-access.service';
import { TradeScopeService } from '../../../customs-trade/experience/services/trade-scope.service';
import { TradeExperienceBoundaryService } from '../../../customs-trade/experience/trade-experience-boundary.service';
import { PrismaService } from '../../../database/prisma.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class BusinessTradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly tradeAccess: CustomsTradeAccessService,
    private readonly scope: TradeScopeService,
    private readonly boundary: TradeExperienceBoundaryService,
  ) {}

  private async requireOrganizationProfile(identityId: string, organizationId: string) {
    const businessAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    await this.tradeAccess.assertOrganizationTradeAccess({
      accessorIdentityId: identityId,
      organizationId,
      actorKind: businessAccess.hasFullOrganizationVisibility
        ? TradeAccessActorKind.ORGANIZATION_MEMBER
        : TradeAccessActorKind.CUSTOMS_BROKER,
      endpoint: 'business-trade',
      businessAccess,
    });

    const profile = await this.scope.findOrganizationTradeProfile(organizationId);
    if (!profile) {
      throw new NotFoundException('No trade profile is registered for this organization');
    }

    return { profile, businessAccess };
  }

  async getHome(identityId: string, organizationId: string) {
    const { profile, businessAccess } = await this.requireOrganizationProfile(
      identityId,
      organizationId,
    );
    const shipmentWhere = this.tradeAccess.buildShipmentWhere(businessAccess);

    const [
      activeShipments,
      declarations,
      inspections,
      holds,
      permits,
      assessments,
      payments,
      releaseRecords,
      documentDeficiencies,
      externalDependencies,
      appeals,
    ] = await Promise.all([
      this.prisma.tradeShipment.count({
        where: {
          ...shipmentWhere,
          status: { in: [TradeShipmentStatus.ACTIVE, TradeShipmentStatus.HELD] },
        },
      }),
      this.prisma.customsDeclaration.count({
        where: {
          organizationId,
          status: {
            in: [
              CustomsDeclarationStatus.SUBMITTED,
              CustomsDeclarationStatus.UNDER_REVIEW,
              CustomsDeclarationStatus.ACCEPTED,
            ],
          },
        },
      }),
      this.prisma.customsInspection.count({ where: { shipment: shipmentWhere } }),
      this.prisma.customsHold.count({
        where: { status: CustomsHoldStatus.ACTIVE, shipment: shipmentWhere },
      }),
      this.prisma.tradePermit.count({ where: { organizationId } }),
      this.prisma.customsAssessment.count({
        where: {
          organizationId,
          status: {
            in: [CustomsAssessmentStatus.ISSUED, CustomsAssessmentStatus.PARTIALLY_PAID],
          },
        },
      }),
      this.prisma.customsAssessmentPayment.count({
        where: { customsAssessment: { organizationId } },
      }),
      this.prisma.customsReleaseRecord.findMany({
        where: { shipment: shipmentWhere },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.customsDocumentDeficiency.count({
        where: { status: 'OPEN', shipment: shipmentWhere },
      }),
      this.prisma.customsExternalDependency.count({
        where: { status: 'PENDING', shipment: shipmentWhere },
      }),
      this.prisma.customsAppeal.count({ where: { organizationId } }),
    ]);

    return {
      organizationId,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      paymentDisclaimer: this.boundary.paymentDisclaimer,
      tradeProfileReference: profile.profileReference,
      importerExporterStatus: {
        importerStatus: profile.importerStatus,
        exporterStatus: profile.exporterStatus,
        brokerAuthorizationStatus: profile.brokerAuthorizationStatus,
      },
      activeShipments,
      declarations,
      inspections,
      holds,
      permits,
      outstandingAssessments: assessments,
      payments,
      releaseStatus: releaseRecords,
      documentDeficiencies,
      externalDependencyStatus: externalDependencies,
      appeals,
      deadlines: [],
    };
  }

  async listShipments(identityId: string, organizationId: string, query: PaginationQueryDto) {
    const { businessAccess } = await this.requireOrganizationProfile(identityId, organizationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.tradeAccess.buildShipmentWhere(businessAccess);

    const [totalItems, items] = await Promise.all([
      this.prisma.tradeShipment.count({ where }),
      this.prisma.tradeShipment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, pagination: { page, pageSize, totalItems } };
  }

  async listDeclarations(identityId: string, organizationId: string) {
    await this.requireOrganizationProfile(identityId, organizationId);
    return this.prisma.customsDeclaration.findMany({
      where: { organizationId },
      include: { currentVersion: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPermits(identityId: string, organizationId: string) {
    await this.requireOrganizationProfile(identityId, organizationId);
    return this.prisma.tradePermit.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAssessments(identityId: string, organizationId: string) {
    await this.requireOrganizationProfile(identityId, organizationId);
    return this.prisma.customsAssessment.findMany({
      where: { organizationId },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listHolds(identityId: string, organizationId: string) {
    const { businessAccess } = await this.requireOrganizationProfile(identityId, organizationId);
    return this.prisma.customsHold.findMany({
      where: { shipment: this.tradeAccess.buildShipmentWhere(businessAccess) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string, organizationId: string) {
    await this.requireOrganizationProfile(identityId, organizationId);

    return {
      actions: [
        { actionCode: 'REGISTER_IMPORTER', label: 'Register as importer' },
        { actionCode: 'REGISTER_EXPORTER', label: 'Register as exporter' },
        { actionCode: 'SUBMIT_IMPORT_DECLARATION', label: 'Submit import declaration' },
        { actionCode: 'SUBMIT_EXPORT_DECLARATION', label: 'Submit export declaration' },
        { actionCode: 'PAY_CUSTOMS_ASSESSMENT', label: 'Pay customs assessment' },
        { actionCode: 'REQUEST_RELEASE_REVIEW', label: 'Request release review' },
        { actionCode: 'RESPOND_TO_HOLD', label: 'Respond to customs hold' },
        { actionCode: 'FILE_CUSTOMS_APPEAL', label: 'File customs appeal' },
      ],
      releaseExecutionExcluded: true,
    };
  }
}
