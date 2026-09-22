import { BadRequestException, Injectable } from '@nestjs/common';
import {
  HealthcareIntegrationExchangeStatus,
  HealthcareIntegrationStandardKind,
  Prisma,
  SourceDiscrepancyStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';

export interface HealthcareInboundImportInput {
  adapterId: string;
  exchangeReference: string;
  inboundProvenance: Prisma.InputJsonValue;
  outboundPurposeCode?: string;
  consentPurposeCode?: string;
  integrationDefinitionId: string;
  fieldReference: string;
  localValue: string;
  externalValue: string;
  fabricateSuccess?: boolean;
}

@Injectable()
export class HealthcareInteropGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: HealthcareBoundaryService,
  ) {}

  async registerAdapterDeclaration(input: {
    adapterCode: string;
    integrationVersionId: string;
    standardKind: HealthcareIntegrationStandardKind;
    declaredVersion: string;
    declaredCapability: Prisma.InputJsonValue;
    mappingLayerRef?: string;
  }) {
    return this.prisma.healthcareIntegrationAdapterDeclaration.create({
      data: {
        adapterCode: input.adapterCode,
        integrationVersionId: input.integrationVersionId,
        standardKind: input.standardKind,
        declaredVersion: input.declaredVersion,
        declaredCapability: input.declaredCapability,
        mappingLayerRef: input.mappingLayerRef,
      },
    });
  }

  async recordInboundImportWithDiscrepancy(input: HealthcareInboundImportInput) {
    if (input.fabricateSuccess) {
      this.boundary.assertIntegrationFailureNotFabricatedSuccess(false, 'SUCCEEDED');
    }

    const discrepancy = await this.prisma.sourceDiscrepancy.create({
      data: {
        integrationDefinitionId: input.integrationDefinitionId,
        fieldReference: input.fieldReference,
        localValue: input.localValue,
        externalValue: input.externalValue,
        status: SourceDiscrepancyStatus.OPEN,
      },
    });

    this.boundary.assertDiscrepancyNotSilentOverwrite(false);

    const exchange = await this.prisma.healthcareIntegrationExchangeRecord.create({
      data: {
        adapterId: input.adapterId,
        exchangeReference: input.exchangeReference,
        direction: 'INBOUND',
        status: HealthcareIntegrationExchangeStatus.DISCREPANCY_OPEN,
        inboundProvenance: input.inboundProvenance,
        outboundPurposeCode: input.outboundPurposeCode,
        consentPurposeCode: input.consentPurposeCode,
        succeeded: false,
        sourceDiscrepancyId: discrepancy.id,
        failureSummary: 'External value diverges from authoritative local state',
      },
    });

    return { exchange, discrepancy };
  }

  async recordFailedClinicalExchange(input: {
    adapterId: string;
    exchangeReference: string;
    failureSummary: string;
  }) {
    const exchange = await this.prisma.healthcareIntegrationExchangeRecord.create({
      data: {
        adapterId: input.adapterId,
        exchangeReference: input.exchangeReference,
        direction: 'OUTBOUND',
        status: HealthcareIntegrationExchangeStatus.FAILED,
        succeeded: false,
        failureSummary: input.failureSummary,
      },
    });

    if (exchange.succeeded) {
      throw new BadRequestException(
        'Integration failure must not fabricate successful transaction',
      );
    }

    return exchange;
  }
}
