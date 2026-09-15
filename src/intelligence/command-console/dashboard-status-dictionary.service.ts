import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DashboardColorSemantic,
  DashboardStatusDictionaryOwnerType,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DashboardBoundaryService } from './dashboard-boundary.service';

export interface CreateStatusDictionaryEntryInput {
  code: string;
  label: string;
  meaning: string;
  colorSemantic: DashboardColorSemantic;
  sourceRequirements?: Prisma.InputJsonValue;
  calculationRule: string;
  limitations: string;
  permittedTransitions?: Prisma.InputJsonValue;
  stalenessRule: string;
  ownerType: DashboardStatusDictionaryOwnerType;
  ownerReference: string;
  institutionId?: string;
}

@Injectable()
export class DashboardStatusDictionaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundaryService: DashboardBoundaryService,
  ) {}

  async createEntry(input: CreateStatusDictionaryEntryInput) {
    this.boundaryService.assertStatusDoesNotCreateAuthority(input.meaning);
    this.boundaryService.assertColorSemanticIsPresentationOnly(input.colorSemantic, input.meaning);

    const latest = await this.prisma.dashboardStatusDictionaryEntry.findFirst({
      where: { code: input.code, institutionId: input.institutionId ?? null },
      orderBy: { version: 'desc' },
    });

    return this.prisma.dashboardStatusDictionaryEntry.create({
      data: {
        code: input.code,
        label: input.label,
        meaning: input.meaning,
        colorSemantic: input.colorSemantic,
        sourceRequirements: input.sourceRequirements ?? [],
        calculationRule: input.calculationRule,
        limitations: input.limitations,
        permittedTransitions: input.permittedTransitions ?? [],
        stalenessRule: input.stalenessRule,
        ownerType: input.ownerType,
        ownerReference: input.ownerReference,
        institutionId: input.institutionId,
        version: (latest?.version ?? 0) + 1,
      },
    });
  }

  async getActiveEntry(code: string, institutionId?: string) {
    const entry = await this.prisma.dashboardStatusDictionaryEntry.findFirst({
      where: {
        code,
        institutionId: institutionId ?? null,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!entry) {
      throw new NotFoundException(`Active status dictionary entry "${code}" was not found`);
    }

    return entry;
  }

  async listActiveEntries(institutionId?: string) {
    return this.prisma.dashboardStatusDictionaryEntry.findMany({
      where: { institutionId: institutionId ?? null, isActive: true },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }
}
