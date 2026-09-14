import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DataExchangeContract,
  DataExchangeField,
  DataExchangeFieldClassification,
  Prisma,
} from '@prisma/client';

type DataExchangeContractWithFields = DataExchangeContract & { fields: DataExchangeField[] };

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { IntegrationsValidationService } from '../common/integrations-validation.service';
import { AddDataExchangeFieldDto } from '../dto/add-data-exchange-field.dto';
import { CreateDataExchangeContractDto } from '../dto/create-data-exchange-contract.dto';

@Injectable()
export class DataExchangeContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IntegrationsValidationService,
    private readonly boundary: IntegrationsBoundaryService,
  ) {}

  async create(dto: CreateDataExchangeContractDto): Promise<DataExchangeContract> {
    await this.validation.ensureIntegrationVersionExists(dto.integrationVersionId);

    try {
      return await this.prisma.dataExchangeContract.create({
        data: {
          integrationVersionId: dto.integrationVersionId,
          schemaIdentifier: dto.schemaIdentifier,
          schemaVersion: dto.schemaVersion,
          classification: dto.classification,
          purpose: dto.purpose,
          minimumNecessaryRule: dto.minimumNecessaryRule,
          validationRules: (dto.validationRules ?? []) as Prisma.InputJsonValue,
          transformationRules: (dto.transformationRules ?? []) as Prisma.InputJsonValue,
          retention: dto.retention,
          loggingRestrictions: dto.loggingRestrictions,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.schemaIdentifier);
    }
  }

  async findByVersion(integrationVersionId: string): Promise<DataExchangeContract[]> {
    await this.validation.ensureIntegrationVersionExists(integrationVersionId);

    return this.prisma.dataExchangeContract.findMany({
      where: { integrationVersionId },
      include: { fields: true },
      orderBy: [{ schemaIdentifier: 'asc' }],
    });
  }

  async findOne(id: string): Promise<DataExchangeContractWithFields> {
    const record = await this.prisma.dataExchangeContract.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!record) {
      throw new NotFoundException(`Data exchange contract with id "${id}" was not found`);
    }

    return record;
  }

  async addField(
    dataExchangeContractId: string,
    dto: AddDataExchangeFieldDto,
  ): Promise<DataExchangeField> {
    const contract = await this.findOne(dataExchangeContractId);

    const prohibitedFields = contract.fields
      .filter((field) => field.classification === DataExchangeFieldClassification.PROHIBITED)
      .map((field) => field.fieldName);

    if (dto.classification === DataExchangeFieldClassification.PERMITTED) {
      this.boundary.assertProhibitedFieldNotInPermittedList(dto.fieldName, prohibitedFields);
    }

    try {
      return await this.prisma.dataExchangeField.create({
        data: {
          dataExchangeContractId,
          fieldName: dto.fieldName,
          classification: dto.classification,
          description: dto.description,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Field "${dto.fieldName}" with classification "${dto.classification}" already exists on contract`,
        );
      }

      throw error;
    }
  }

  getPermittedFields(contract: DataExchangeContractWithFields): string[] {
    const prohibited = new Set(
      contract.fields
        .filter((field) => field.classification === DataExchangeFieldClassification.PROHIBITED)
        .map((field) => field.fieldName),
    );

    return contract.fields
      .filter(
        (field) =>
          field.classification === DataExchangeFieldClassification.PERMITTED &&
          !prohibited.has(field.fieldName),
      )
      .map((field) => field.fieldName);
  }

  private handleWriteError(error: unknown, schemaIdentifier: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Data exchange contract with schema "${schemaIdentifier}" already exists for this version`,
      );
    }

    throw error;
  }
}
