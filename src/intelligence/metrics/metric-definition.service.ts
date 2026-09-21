import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type MetricDefinition,
  MetricDefinitionStatus,
  type MetricDefinitionVersion,
  MetricDefinitionVersionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { CreateMetricDefinitionDto } from '../dto/create-metric-definition.dto';
import { CreateMetricDefinitionVersionDto } from '../dto/create-metric-definition-version.dto';

@Injectable()
export class MetricDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async createDefinition(dto: CreateMetricDefinitionDto): Promise<MetricDefinition> {
    this.boundary.assertMetricHasCalculationMethod(dto.calculationMethod);
    this.boundary.assertMetricHasSourceRequirements(dto.sourceRequirements);

    return this.prisma.metricDefinition.create({
      data: {
        frameworkId: dto.frameworkId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        purpose: dto.purpose,
        ownerInstitutionId: dto.ownerInstitutionId,
        ownerDepartmentId: dto.ownerDepartmentId,
        metricCategory: dto.metricCategory,
        unit: dto.unit,
        aggregationMethod: dto.aggregationMethod,
        calculationMethod: dto.calculationMethod,
        sourceRequirements: dto.sourceRequirements as Prisma.InputJsonValue,
        scope: dto.scope,
        reportingFrequency: dto.reportingFrequency,
        qualityRequirements: (dto.qualityRequirements ?? {}) as Prisma.InputJsonValue,
        baselineRequired: dto.baselineRequired ?? true,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
      },
    });
  }

  async createVersion(
    metricDefinitionId: string,
    dto: CreateMetricDefinitionVersionDto,
  ): Promise<MetricDefinitionVersion> {
    const definition = await this.prisma.metricDefinition.findUnique({
      where: { id: metricDefinitionId },
    });
    if (!definition) {
      throw new NotFoundException(`Metric definition ${metricDefinitionId} not found`);
    }

    const latest = await this.prisma.metricDefinitionVersion.findFirst({
      where: { metricDefinitionId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const formula = dto.formulaSpecification;
    if (formula.type === 'javascript' || formula.type === 'eval') {
      throw new BadRequestException(
        'Arbitrary executable JavaScript formulas are not permitted; use constrained deterministic calculations',
      );
    }

    return this.prisma.metricDefinitionVersion.create({
      data: {
        metricDefinitionId,
        versionNumber,
        formulaSpecification: dto.formulaSpecification as Prisma.InputJsonValue,
        sourceDefinitions: (dto.sourceDefinitions ?? []) as Prisma.InputJsonValue,
        inclusions: (dto.inclusions ?? []) as Prisma.InputJsonValue,
        exclusions: (dto.exclusions ?? []) as Prisma.InputJsonValue,
        dependencyTimeClassification: dto.dependencyTimeClassification,
        roundingRule: dto.roundingRule,
        percentileMethod: dto.percentileMethod,
        dataQualityThresholds: (dto.dataQualityThresholds ?? {}) as Prisma.InputJsonValue,
        materialityThreshold: dto.materialityThreshold,
        revalidationIntervalDays: dto.revalidationIntervalDays,
      },
    });
  }

  async activateVersion(versionId: string): Promise<MetricDefinitionVersion> {
    const version = await this.prisma.metricDefinitionVersion.findUnique({
      where: { id: versionId },
      include: { metricDefinition: true },
    });
    if (!version) {
      throw new NotFoundException(`Metric version ${versionId} not found`);
    }
    if (version.status === MetricDefinitionVersionStatus.ACTIVE) {
      throw new BadRequestException('Active metric versions are immutable');
    }

    this.boundary.assertMetricHasSourceRequirements(version.metricDefinition.sourceRequirements);
    this.boundary.assertMetricHasCalculationMethod(version.metricDefinition.calculationMethod);

    return this.prisma.$transaction(async (tx) => {
      await tx.metricDefinitionVersion.updateMany({
        where: {
          metricDefinitionId: version.metricDefinitionId,
          status: MetricDefinitionVersionStatus.ACTIVE,
        },
        data: {
          status: MetricDefinitionVersionStatus.SUPERSEDED,
          supersededAt: new Date(),
        },
      });

      return tx.metricDefinitionVersion.update({
        where: { id: versionId },
        data: {
          status: MetricDefinitionVersionStatus.ACTIVE,
          activatedAt: new Date(),
        },
      });
    });
  }

  async findDefinitionById(metricDefinitionId: string): Promise<MetricDefinition> {
    const definition = await this.prisma.metricDefinition.findUnique({
      where: { id: metricDefinitionId },
    });
    if (!definition) {
      throw new NotFoundException(`Metric definition ${metricDefinitionId} not found`);
    }
    return definition;
  }

  async findVersionById(versionId: string): Promise<MetricDefinitionVersion> {
    const version = await this.prisma.metricDefinitionVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(`Metric version ${versionId} not found`);
    }
    return version;
  }

  async publishDefinition(metricDefinitionId: string): Promise<MetricDefinition> {
    const definition = await this.prisma.metricDefinition.findUnique({
      where: { id: metricDefinitionId },
      include: { versions: { where: { status: MetricDefinitionVersionStatus.ACTIVE } } },
    });
    if (!definition) {
      throw new NotFoundException(`Metric definition ${metricDefinitionId} not found`);
    }

    this.boundary.assertMetricHasSourceRequirements(definition.sourceRequirements);
    this.boundary.assertMetricHasCalculationMethod(definition.calculationMethod);

    if (definition.versions.length === 0) {
      throw new BadRequestException('Metric cannot publish without an active version');
    }

    return this.prisma.metricDefinition.update({
      where: { id: metricDefinitionId },
      data: { status: MetricDefinitionStatus.ACTIVE },
    });
  }
}
