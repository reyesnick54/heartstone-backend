import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, InspectionTypeDefinitionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateInspectionTypeDefinitionInput {
  code: string;
  name: string;
  purpose: string;
  responsibleInstitutionId: string;
  responsibleDepartmentId?: string;
  functionAuthorityRecordId: string;
  requiredAuthorityAction?: AuthorityActionType;
  jurisdictionId: string;
  subjectMatter: string;
  requiredCompetence: string;
  professionalRequirement?: string;
  noticeRequirement?: Record<string, unknown>;
  unannouncedAllowed?: boolean;
  evidenceRequirements?: unknown[];
}

@Injectable()
export class InspectionTypeDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInspectionTypeDefinitionInput) {
    return this.prisma.inspectionTypeDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        purpose: input.purpose,
        responsibleInstitutionId: input.responsibleInstitutionId,
        responsibleDepartmentId: input.responsibleDepartmentId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        requiredAuthorityAction: input.requiredAuthorityAction ?? AuthorityActionType.INSPECT,
        jurisdictionId: input.jurisdictionId,
        subjectMatter: input.subjectMatter,
        requiredCompetence: input.requiredCompetence,
        professionalRequirement: input.professionalRequirement,
        noticeRequirement: (input.noticeRequirement ?? {}) as Prisma.InputJsonValue,
        unannouncedAllowed: input.unannouncedAllowed ?? false,
        evidenceRequirements: (input.evidenceRequirements ?? []) as Prisma.InputJsonValue,
        status: InspectionTypeDefinitionStatus.DRAFT,
      },
    });
  }

  async activate(id: string) {
    const definition = await this.prisma.inspectionTypeDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException('Inspection type definition not found');
    }

    return this.prisma.inspectionTypeDefinition.update({
      where: { id },
      data: { status: InspectionTypeDefinitionStatus.ACTIVE },
    });
  }
}
