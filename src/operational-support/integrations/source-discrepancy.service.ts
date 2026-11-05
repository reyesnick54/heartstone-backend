import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { SourceDiscrepancy, SourceDiscrepancyStatus } from '@prisma/client';

import { API_ERROR_CODES, codedErrorBody } from '../../common/errors/api-error-codes';
import { PrismaService } from '../../database/prisma.service';

export interface RecordSourceDiscrepancyInput {
  integrationDefinitionId: string;
  fieldReference: string;
  localValue: string | null;
  externalValue: string | null;
  material?: boolean;
}

@Injectable()
export class SourceDiscrepancyService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDiscrepancy(input: RecordSourceDiscrepancyInput): Promise<SourceDiscrepancy> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: input.integrationDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException(
        `IntegrationDefinition ${input.integrationDefinitionId} not found`,
      );
    }

    const status =
      input.material === true ? SourceDiscrepancyStatus.SAFE_HALTED : SourceDiscrepancyStatus.OPEN;

    return this.prisma.sourceDiscrepancy.create({
      data: {
        integrationDefinitionId: input.integrationDefinitionId,
        fieldReference: input.fieldReference,
        localValue: input.localValue,
        externalValue: input.externalValue,
        status,
      },
    });
  }

  async resolveDiscrepancy(
    discrepancyId: string,
    resolutionAction: string,
    resolvedByIdentityId?: string,
    notes?: string,
  ): Promise<SourceDiscrepancy> {
    const discrepancy = await this.prisma.sourceDiscrepancy.findUnique({
      where: { id: discrepancyId },
    });

    if (!discrepancy) {
      throw new NotFoundException(`SourceDiscrepancy ${discrepancyId} not found`);
    }

    if (discrepancy.status === SourceDiscrepancyStatus.SAFE_HALTED) {
      throw new BadRequestException(
        codedErrorBody(
          HttpStatus.BAD_REQUEST,
          'Material discrepancies in SAFE_HALTED status require institutional review before resolution',
          API_ERROR_CODES.SAFE_HALT,
        ),
      );
    }

    await this.prisma.sourceDiscrepancyResolution.create({
      data: {
        sourceDiscrepancyId: discrepancyId,
        resolutionAction,
        resolvedByIdentityId,
        notes,
      },
    });

    return this.prisma.sourceDiscrepancy.update({
      where: { id: discrepancyId },
      data: { status: SourceDiscrepancyStatus.RESOLVED },
    });
  }

  async getDiscrepancy(discrepancyId: string): Promise<SourceDiscrepancy | null> {
    return this.prisma.sourceDiscrepancy.findUnique({
      where: { id: discrepancyId },
      include: { resolutions: true },
    });
  }
}
