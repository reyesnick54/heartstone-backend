import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CitizenAccessService } from '../../../experience/common/citizen-access.service';
import { IMMIGRATION_SERVICE_FAMILY_CODE } from '../../immigration.constants';

@Injectable()
export class ImmigrationScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAccess: CitizenAccessService,
  ) {}

  immigrationServiceWhere(): Prisma.GovernmentServiceWhereInput {
    return {
      serviceFamily: { code: IMMIGRATION_SERVICE_FAMILY_CODE },
    };
  }

  async buildCitizenApplicationWhere(identityId: string): Promise<Prisma.ApplicationWhereInput> {
    const scope = await this.citizenAccess.resolveAccessibleScope(identityId);
    return {
      AND: [
        this.citizenAccess.buildApplicationWhere(scope),
        { governmentService: this.immigrationServiceWhere() },
      ],
    };
  }

  async buildCitizenCaseWhere(identityId: string): Promise<Prisma.CaseWhereInput> {
    const scope = await this.citizenAccess.resolveAccessibleScope(identityId);
    return {
      AND: [
        this.citizenAccess.buildCaseWhere(scope),
        { governmentService: this.immigrationServiceWhere() },
      ],
    };
  }

  buildOfficialCaseWhere(departmentIds: string[]): Prisma.CaseWhereInput {
    return {
      responsibleDepartmentId: { in: departmentIds },
      governmentService: this.immigrationServiceWhere(),
    };
  }
}
