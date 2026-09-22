import { Injectable } from '@nestjs/common';
import { BenefitProgramStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';

@Injectable()
export class BenefitProgramDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async listProgramsForGenericSearch(jurisdictionId?: string) {
    const programs = await this.prisma.benefitProgram.findMany({
      where: {
        status: BenefitProgramStatus.ACTIVE,
        ...(jurisdictionId ? { jurisdictionId } : {}),
      },
      include: { benefitCategory: true },
      orderBy: { programName: 'asc' },
    });

    return this.boundary.filterSensitiveProgramsFromGenericSearch(programs);
  }
}
