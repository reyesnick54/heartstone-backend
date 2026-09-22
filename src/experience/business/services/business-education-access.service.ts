import { Injectable } from '@nestjs/common';

import { EducationAccessService } from '../../../education/common/education-access.service';

@Injectable()
export class BusinessEducationAccessService {
  constructor(private readonly educationAccess: EducationAccessService) {}

  assertOrganizationEducationAccess(identityId: string, organizationId: string): Promise<void> {
    return this.educationAccess.assertOrganizationEducationAccess(identityId, organizationId);
  }
}
