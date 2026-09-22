import { Injectable } from '@nestjs/common';
import {
  PropertyRegistryApplicationStatus,
  PropertyRegistryApplicationType,
  PropertySurveySubmissionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryBoundaryService } from '../common/property-registry-boundary.service';

@Injectable()
export class PropertySurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryBoundaryService,
  ) {}

  async submitSurveyPlan(input: {
    parcelId: string;
    applicantIdentityId: string;
  }) {
    const parcel = await this.prisma.propertyParcel.findUniqueOrThrow({
      where: { id: input.parcelId },
    });

    const application = await this.prisma.propertyRegistryApplication.create({
      data: {
        parcelId: input.parcelId,
        applicationType: PropertyRegistryApplicationType.SURVEY,
        status: PropertyRegistryApplicationStatus.SUBMITTED,
        applicantIdentityId: input.applicantIdentityId,
        applicationReference: `PROP-APP-SV-${String(Date.now())}`,
        mayMutateTitle: false,
        submittedAt: new Date(),
      },
    });

    const altersParcelGeometry = false;
    this.boundary.assertSurveyDoesNotAlterParcel(altersParcelGeometry);

    return this.prisma.propertySurveySubmission.create({
      data: {
        parcelId: input.parcelId,
        applicationId: application.id,
        status: PropertySurveySubmissionStatus.RECEIVED,
        altersParcelGeometry,
        registryVersionAtSubmission: parcel.registryVersion,
      },
    });
  }
}
