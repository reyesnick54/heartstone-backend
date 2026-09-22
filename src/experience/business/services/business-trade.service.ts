import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomsAssessmentStatus,
  CustomsDeclarationStatus,
  CustomsHoldStatus,
  CustomsRegistrationStatus,
  ShipmentReferenceStatus,
} from '@prisma/client';

import { TradeExperienceBoundaryService } from '../../../customs-trade/experience/trade-experience-boundary.service';
import { PrismaService } from '../../../database/prisma.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BusinessTradeAccessService } from './business-trade-access.service';

@Injectable()
export class BusinessTradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly tradeAccess: BusinessTradeAccessService,
    private readonly boundary: TradeExperienceBoundaryService,
  ) {}

  private async requireTraderAccount(identityId: string, organizationId: string) {
    const businessAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const traderAccount = await this.prisma.traderAccount.findFirst({
      where: { organizationId },
      include: {
        importerRegistration: true,
        exporterRegistration: true,
        brokerAuthorizations: true,
      },
    });

    if (!traderAccount) {
      throw new NotFoundException('No trader account is registered for this organization');
    }

    return { traderAccount, businessAccess };
  }

  async getHome(identityId: string, organizationId: string) {
    const { traderAccount, businessAccess } = await this.requireTraderAccount(
      identityId,
      organizationId,
    );
    const shipmentWhere = await this.tradeAccess.buildShipmentReferenceWhere(businessAccess);

    const [
      activeShipments,
      declarations,
      inspections,
      holds,
      permitReferences,
      assessments,
      releaseRecords,
      externalDependencies,
    ] = await Promise.all([
      this.prisma.shipmentReference.count({
        where: {
          ...shipmentWhere,
          status: {
            in: [
              ShipmentReferenceStatus.REGISTERED,
              ShipmentReferenceStatus.IN_TRANSIT,
              ShipmentReferenceStatus.ARRIVED,
              ShipmentReferenceStatus.UNDER_CUSTOMS,
            ],
          },
        },
      }),
      this.prisma.customsDeclaration.count({
        where: {
          traderAccountId: traderAccount.id,
          status: {
            in: [
              CustomsDeclarationStatus.SUBMITTED,
              CustomsDeclarationStatus.UNDER_REVIEW,
              CustomsDeclarationStatus.ASSESSED,
            ],
          },
        },
      }),
      this.prisma.customsInspection.count({
        where: { shipmentReference: shipmentWhere },
      }),
      this.prisma.customsHold.count({
        where: { status: CustomsHoldStatus.ACTIVE, shipmentReference: shipmentWhere },
      }),
      this.prisma.tradePermitReference.count({
        where: { customsDeclaration: { traderAccountId: traderAccount.id } },
      }),
      this.prisma.customsAssessment.count({
        where: {
          customsDeclaration: { traderAccountId: traderAccount.id },
          status: { in: [CustomsAssessmentStatus.ISSUED, CustomsAssessmentStatus.PROPOSED] },
        },
      }),
      this.prisma.customsReleaseRecord.findMany({
        where: { shipmentReference: shipmentWhere },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.customsExternalDependency.count({
        where: {
          OR: [
            { shipmentReference: shipmentWhere },
            { customsDeclaration: { traderAccountId: traderAccount.id } },
          ],
        },
      }),
    ]);

    return {
      organizationId,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      paymentDisclaimer: this.boundary.paymentDisclaimer,
      tradeProfileReference: traderAccount.accountNumber,
      importerExporterStatus: {
        importerStatus:
          traderAccount.importerRegistration?.status ?? CustomsRegistrationStatus.DRAFT,
        exporterStatus:
          traderAccount.exporterRegistration?.status ?? CustomsRegistrationStatus.DRAFT,
        brokerAuthorizationCount: traderAccount.brokerAuthorizations.length,
      },
      activeShipments,
      declarations,
      inspections,
      holds,
      permits: permitReferences,
      outstandingAssessments: assessments,
      releaseStatus: releaseRecords,
      externalDependencyStatus: externalDependencies,
      deadlines: [],
    };
  }

  async listShipments(identityId: string, organizationId: string, query: PaginationQueryDto) {
    const businessAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = await this.tradeAccess.buildShipmentReferenceWhere(businessAccess);

    const [totalItems, items] = await Promise.all([
      this.prisma.shipmentReference.count({ where }),
      this.prisma.shipmentReference.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, pagination: { page, pageSize, totalItems } };
  }

  async listDeclarations(identityId: string, organizationId: string) {
    const { traderAccount } = await this.requireTraderAccount(identityId, organizationId);
    return this.prisma.customsDeclaration.findMany({
      where: { traderAccountId: traderAccount.id },
      include: { currentVersion: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPermits(identityId: string, organizationId: string) {
    const { traderAccount } = await this.requireTraderAccount(identityId, organizationId);
    return this.prisma.tradePermitReference.findMany({
      where: { customsDeclaration: { traderAccountId: traderAccount.id } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAssessments(identityId: string, organizationId: string) {
    const { traderAccount } = await this.requireTraderAccount(identityId, organizationId);
    return this.prisma.customsAssessment.findMany({
      where: { customsDeclaration: { traderAccountId: traderAccount.id } },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listHolds(identityId: string, organizationId: string) {
    const businessAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const shipmentWhere = await this.tradeAccess.buildShipmentReferenceWhere(businessAccess);
    return this.prisma.customsHold.findMany({
      where: { shipmentReference: shipmentWhere },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string, organizationId: string) {
    await this.requireTraderAccount(identityId, organizationId);

    return {
      actions: [
        { actionCode: 'REGISTER_IMPORTER', label: 'Register as importer' },
        { actionCode: 'REGISTER_EXPORTER', label: 'Register as exporter' },
        { actionCode: 'SUBMIT_IMPORT_DECLARATION', label: 'Submit import declaration' },
        { actionCode: 'SUBMIT_EXPORT_DECLARATION', label: 'Submit export declaration' },
        { actionCode: 'PAY_CUSTOMS_ASSESSMENT', label: 'Pay customs assessment' },
        { actionCode: 'REQUEST_RELEASE_REVIEW', label: 'Request release review' },
        { actionCode: 'RESPOND_TO_HOLD', label: 'Respond to customs hold' },
        { actionCode: 'FILE_CUSTOMS_REFUND_CLAIM', label: 'File customs refund claim' },
      ],
      releaseExecutionExcluded: true,
    };
  }
}
