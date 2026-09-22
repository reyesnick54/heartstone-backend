import { ForbiddenException, Injectable } from '@nestjs/common';
import { ImmigrationSponsorshipStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ImmigrationBoundaryService } from '../common/immigration-boundary.service';
import { type SponsorAuthorizedScope } from '../immigration.constants';

@Injectable()
export class ImmigrationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ImmigrationBoundaryService,
  ) {}

  assertApplicantOwnsProfile(requesterIdentityId: string, subjectIdentityId: string): void {
    this.boundary.assertCrossApplicantBlocked(requesterIdentityId, subjectIdentityId);
  }

  async assertSponsorMayViewCase(sponsorIdentityId: string, caseId: string): Promise<void> {
    const sponsorship = await this.prisma.immigrationSponsorship.findFirst({
      where: {
        sponsorIdentityId,
        caseId,
        status: { in: [ImmigrationSponsorshipStatus.ACTIVE, ImmigrationSponsorshipStatus.LIMITED] },
      },
    });
    if (!sponsorship) {
      throw new ForbiddenException('No authorized sponsorship scope for this case');
    }

    const scope = sponsorship.authorizedScope as SponsorAuthorizedScope;
    this.boundary.assertSponsorScope(scope, 'viewCaseStatus');
  }
}
