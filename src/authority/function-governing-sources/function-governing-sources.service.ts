import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FunctionGoverningSource,
  FunctionSourceInterpretationStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AuthorityAuditService } from '../common/authority-audit.service';
import { FunctionAuthorityRecordsService } from '../functions/function-authority-records.service';
import { GoverningSourcesService } from '../governing-sources/governing-sources.service';
import { CreateFunctionGoverningSourceDto } from './dto/create-function-governing-source.dto';
import { UpdateFunctionGoverningSourceDto } from './dto/update-function-governing-source.dto';

@Injectable()
export class FunctionGoverningSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthorityAuditService,
    private readonly functionAuthorityRecords: FunctionAuthorityRecordsService,
    private readonly governingSources: GoverningSourcesService,
  ) {}

  async link(
    functionAuthorityRecordId: string,
    dto: CreateFunctionGoverningSourceDto,
  ): Promise<FunctionGoverningSource> {
    await this.functionAuthorityRecords.findOne(functionAuthorityRecordId);
    await this.governingSources.findOne(dto.governingSourceId);

    try {
      const link = await this.prisma.functionGoverningSource.create({
        data: {
          functionAuthorityRecordId,
          governingSourceId: dto.governingSourceId,
          provisionCitation: dto.provisionCitation,
          relationshipType: dto.relationshipType,
          isPrimary: dto.isPrimary ?? false,
          interpretationStatus: FunctionSourceInterpretationStatus.UNRESOLVED,
          effectiveFrom: dto.effectiveFrom,
          effectiveUntil: dto.effectiveUntil,
          notes: dto.notes,
        },
      });

      await this.audit.record('FUNCTION_GOVERNING_SOURCE_LINKED', {
        linkId: link.id,
        functionAuthorityRecordId,
        governingSourceId: dto.governingSourceId,
        isPrimary: link.isPrimary,
        relationshipType: link.relationshipType,
      });

      return link;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This function-source crosswalk link already exists');
      }

      throw error;
    }
  }

  async findByFunction(functionAuthorityRecordId: string): Promise<FunctionGoverningSource[]> {
    await this.functionAuthorityRecords.findOne(functionAuthorityRecordId);

    return this.prisma.functionGoverningSource.findMany({
      where: { functionAuthorityRecordId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async update(
    linkId: string,
    dto: UpdateFunctionGoverningSourceDto,
  ): Promise<FunctionGoverningSource> {
    const existing = await this.prisma.functionGoverningSource.findUnique({
      where: { id: linkId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Function governing source link with id "${linkId}" was not found`,
      );
    }

    if (
      dto.interpretationStatus === FunctionSourceInterpretationStatus.RESOLVED &&
      existing.interpretationStatus === FunctionSourceInterpretationStatus.CONTESTED &&
      !dto.actorIdentityId
    ) {
      throw new BadRequestException(
        'Contested interpretation cannot be resolved without an identified actor identity',
      );
    }

    const link = await this.prisma.functionGoverningSource.update({
      where: { id: linkId },
      data: {
        provisionCitation: dto.provisionCitation,
        isPrimary: dto.isPrimary,
        interpretationStatus: dto.interpretationStatus,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
        notes: dto.notes,
      },
    });

    await this.audit.record('FUNCTION_GOVERNING_SOURCE_UPDATED', {
      linkId: link.id,
      functionAuthorityRecordId: link.functionAuthorityRecordId,
      governingSourceId: link.governingSourceId,
      previousInterpretationStatus: existing.interpretationStatus,
      newInterpretationStatus: link.interpretationStatus,
      actorIdentityId: dto.actorIdentityId,
    });

    return link;
  }
}
