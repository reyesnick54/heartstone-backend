import { Injectable } from '@nestjs/common';
import { OfficialInstrumentStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { mapInstitutionAttribution } from '../../citizen/mappers/citizen-attribution.mapper';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type BusinessLicensesResponseDto } from '../dto/business-license.dto';

const ACTIVE_INSTRUMENT_STATUSES: OfficialInstrumentStatus[] = [
  OfficialInstrumentStatus.ISSUED,
  OfficialInstrumentStatus.EFFECTIVE,
  OfficialInstrumentStatus.RENEWED,
];

@Injectable()
export class BusinessLicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listLicenses(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessLicensesResponseDto> {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const now = new Date();
    const expirationHorizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const where = {
      holderOrganizationId: organizationId,
      status: { in: ACTIVE_INSTRUMENT_STATUSES },
    };

    const [totalItems, instruments] = await Promise.all([
      this.prisma.officialInstrument.count({ where }),
      this.prisma.officialInstrument.findMany({
        where,
        include: {
          case: {
            include: {
              governmentService: {
                include: { responsibleInstitution: true, responsibleDepartment: true },
              },
            },
          },
        },
        orderBy: [{ effectiveUntil: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: instruments.map((instrument) => ({
        instrumentId: instrument.id,
        instrumentNumber: instrument.instrumentNumber ?? instrument.id,
        status: instrument.status,
        effectiveFrom: instrument.effectiveFrom?.toISOString() ?? null,
        effectiveUntil: instrument.effectiveUntil?.toISOString() ?? null,
        approachingExpiry:
          instrument.effectiveUntil !== null &&
          instrument.effectiveUntil >= now &&
          instrument.effectiveUntil <= expirationHorizon,
        caseId: instrument.caseId,
        attribution: instrument.case ? mapInstitutionAttribution(instrument.case) : undefined,
      })),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
      disclaimer: {
        label:
          'Licenses and permits shown are organization-held instruments. Payment or display does not imply approval.',
        labelKey: 'business.licenses.disclaimer',
      },
    };
  }
}
