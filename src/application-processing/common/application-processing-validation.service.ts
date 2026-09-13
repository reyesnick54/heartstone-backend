import { Injectable } from '@nestjs/common';
import {
  ApplicantCategory,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { APPLICATION_STARTABLE_AVAILABILITY } from '../../service-catalog/common/public-discovery.constants';
import {
  InvalidFormVersionException,
  RepresentativeAuthorityInvalidException,
  ServiceNotStartableException,
  VersionSupersededSubmissionException,
} from './exceptions/application-processing.exceptions';

@Injectable()
export class ApplicationProcessingValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertServiceStartable(governmentServiceVersionId: string): Promise<void> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: governmentServiceVersionId },
    });

    if (!version) {
      throw new ServiceNotStartableException('Government service version not found');
    }

    if (version.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE) {
      throw new ServiceNotStartableException('Service is not operationally active');
    }

    if (!APPLICATION_STARTABLE_AVAILABILITY.includes(version.publicAvailability)) {
      throw new ServiceNotStartableException(
        'Service public availability does not permit applications',
      );
    }

    if (version.publicAvailability === GovernmentServicePublicAvailability.SUSPENDED) {
      throw new ServiceNotStartableException('Service is suspended');
    }

    if (version.supersededAt || version.supersededByVersionId) {
      throw new VersionSupersededSubmissionException();
    }
  }

  async assertFormVersionValid(
    formVersionId: string,
    expectedFormVersionId: string,
  ): Promise<void> {
    if (formVersionId !== expectedFormVersionId) {
      throw new InvalidFormVersionException(
        'Form version does not match pinned service configuration',
      );
    }

    const formVersion = await this.prisma.formVersion.findUnique({
      where: { id: formVersionId },
    });

    if (formVersion?.status !== FormVersionStatus.PUBLISHED) {
      throw new InvalidFormVersionException();
    }
  }

  assertConfigurationFingerprint(providedFingerprint: string, expectedFingerprint: string): void {
    if (providedFingerprint !== expectedFingerprint) {
      throw new VersionSupersededSubmissionException();
    }
  }

  async assertApplicantCategoryAllowed(
    governmentServiceVersionId: string,
    applicantCategory: ApplicantCategory,
  ): Promise<void> {
    const allowed = await this.prisma.governmentServiceVersionApplicantCategory.findFirst({
      where: { governmentServiceVersionId, category: applicantCategory },
    });

    if (!allowed) {
      throw new ServiceNotStartableException(
        'Applicant category is not permitted for this service',
      );
    }
  }

  async assertRepresentativeAuthority(
    representativeAuthorityId: string,
    applicantIdentityId: string,
    organizationId: string,
    at: Date = new Date(),
  ): Promise<void> {
    const authority = await this.prisma.representativeAuthority.findUnique({
      where: { id: representativeAuthorityId },
    });

    if (
      authority?.status !== RepresentativeAuthorityStatus.ACTIVE ||
      authority.identityId !== applicantIdentityId ||
      authority.organizationId !== organizationId ||
      authority.effectiveFrom > at ||
      (authority.effectiveUntil && authority.effectiveUntil <= at)
    ) {
      throw new RepresentativeAuthorityInvalidException();
    }
  }
}
