import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { EducationAccessService } from '../../common/education-access.service';
import { EDUCATION_SERVICE_FAMILY_CODE } from '../../education.constants';

@Injectable()
export class EducationScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: EducationAccessService,
  ) {}

  educationServiceWhere(): Prisma.GovernmentServiceWhereInput {
    return {
      serviceFamily: { code: EDUCATION_SERVICE_FAMILY_CODE },
    };
  }

  async resolveAccessibleStudentProfileIds(identityId: string): Promise<string[]> {
    const ownProfiles = await this.prisma.studentEducationProfile.findMany({
      where: { studentIdentityId: identityId },
      select: { id: true },
    });
    const dependentProfiles =
      await this.access.resolveGuardianAuthorizedStudentProfileIds(identityId);
    return [...new Set([...ownProfiles.map((p) => p.id), ...dependentProfiles])];
  }

  buildOfficialCaseWhere(departmentIds: string[]): Prisma.CaseWhereInput {
    return {
      responsibleDepartmentId: { in: departmentIds },
      governmentService: this.educationServiceWhere(),
    };
  }
}
