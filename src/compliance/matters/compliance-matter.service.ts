import { createHash } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceMatterStatus, OfficialInstrumentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { ScopedResourceType } from '../../institutional-scope/institutional-scope.types';
import { ResourceAccessService } from '../../institutional-scope/resource-access.service';
import { COMPLIANCE_MATTER_NUMBER_PREFIX } from '../compliance.constants';

export interface OpenComplianceMatterInput {
  masterAdministrativeFileId: string;
  officialInstrumentId: string;
  responsibleInstitutionId: string;
  responsibleDepartmentId: string;
  caseId?: string;
  holderIdentityId?: string;
  holderOrganizationId?: string;
}

@Injectable()
export class ComplianceMatterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  async openFromIssuedInstrument(input: OpenComplianceMatterInput) {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: input.officialInstrumentId },
    });

    if (!instrument) {
      throw new NotFoundException(`OfficialInstrument ${input.officialInstrumentId} not found`);
    }

    if (instrument.status !== OfficialInstrumentStatus.ISSUED) {
      throw new BadRequestException(
        'Compliance monitoring may begin only after controlled issuance produces an ISSUED instrument',
      );
    }

    if (instrument.masterAdministrativeFileId !== input.masterAdministrativeFileId) {
      throw new BadRequestException(
        'Compliance matter must reference the same master administrative file as the instrument',
      );
    }

    const complianceMatterNumber = `${COMPLIANCE_MATTER_NUMBER_PREFIX}-${String(Date.now())}-${instrument.instrumentNumber ?? instrument.id.slice(0, 8)}`;

    return this.prisma.complianceMatter.create({
      data: {
        complianceMatterNumber,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        caseId: input.caseId ?? instrument.caseId,
        officialInstrumentId: input.officialInstrumentId,
        holderIdentityId: input.holderIdentityId ?? instrument.holderIdentityId,
        holderOrganizationId: input.holderOrganizationId ?? instrument.holderOrganizationId,
        responsibleInstitutionId: input.responsibleInstitutionId,
        responsibleDepartmentId: input.responsibleDepartmentId,
        status: ComplianceMatterStatus.MONITORING,
      },
    });
  }

  async findById(id: string, session?: SessionContextDto) {
    if (session) {
      await this.resourceAccess.assertVisibility(
        session,
        ScopedResourceType.COMPLIANCE_MATTER,
        id,
      );
    }

    const matter = await this.prisma.complianceMatter.findUnique({
      where: { id },
      include: {
        continuingObligations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!matter) {
      throw new NotFoundException(`ComplianceMatter ${id} not found`);
    }

    return matter;
  }

  async findByNumber(complianceMatterNumber: string) {
    const matter = await this.prisma.complianceMatter.findUnique({
      where: { complianceMatterNumber },
      include: {
        continuingObligations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!matter) {
      throw new NotFoundException(`ComplianceMatter ${complianceMatterNumber} not found`);
    }

    return matter;
  }
}

export function hashConditionText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
