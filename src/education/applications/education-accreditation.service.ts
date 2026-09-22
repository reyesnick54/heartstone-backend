import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { EducationAccreditationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';

@Injectable()
export class EducationAccreditationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async proposeAccreditationRecord(input: {
    institutionRegistryRecordId: string;
    organizationId: string;
    accreditingOrganizationId: string;
    hasOfficialAuthority: boolean;
  }) {
    this.boundary.assertInstitutionCannotSelfAccredit(
      input.accreditingOrganizationId,
      input.organizationId,
    );
    this.boundary.assertOfficialWithoutAuthorityCannotGrantAccreditation(
      input.hasOfficialAuthority,
    );

    return this.prisma.educationAccreditationRecord.create({
      data: {
        id: randomUUID(),
        accreditationNumber: `EDU-ACC-${randomUUID().slice(0, 8).toUpperCase()}`,
        institutionRegistryRecordId: input.institutionRegistryRecordId,
        organizationId: input.organizationId,
        status: EducationAccreditationStatus.APPLICATION_PENDING,
        grantedByOrganizationId: input.accreditingOrganizationId,
        publicVerificationToken: `pub-acc-${randomUUID().slice(0, 12)}`,
      },
    });
  }
}
