import { Injectable } from '@nestjs/common';
import { PropertyPublicVerificationMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  PropertyPublicVerificationDisabledException,
  PropertyPublicVerificationNotFoundException,
} from '../common/property-registry.exceptions';
import { PropertyRegistryBoundaryService } from '../common/property-registry-boundary.service';
import { PropertyRegistryConfigurationService } from '../configuration/property-registry-configuration.service';
import { PROPERTY_PUBLIC_VERIFICATION_DISCLAIMER } from '../property-registry.constants';

@Injectable()
export class PublicPropertyRegistryVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configurationService: PropertyRegistryConfigurationService,
    private readonly boundary: PropertyRegistryBoundaryService,
  ) {}

  async verify(reference: string) {
    const configuration = await this.configurationService.getDefaultConfiguration();
    if (configuration.publicVerificationMode !== PropertyPublicVerificationMode.MINIMAL_FACTS) {
      throw new PropertyPublicVerificationDisabledException();
    }

    const parcel = await this.prisma.propertyParcel.findFirst({
      where: {
        OR: [{ publicVerificationReference: reference }, { parcelReference: reference }],
      },
    });

    if (!parcel) {
      throw new PropertyPublicVerificationNotFoundException(reference);
    }

    const sanitized = this.boundary.sanitizePublicVerificationPayload({
      parcelReference: parcel.parcelReference,
      status: parcel.status,
      administrativeAddressSummary: parcel.administrativeAddressSummary,
      internalParcelIdentifier: parcel.internalParcelIdentifier,
      sealedDataReference: parcel.sealedDataReference,
    });

    return {
      ...sanitized,
      disclaimer: PROPERTY_PUBLIC_VERIFICATION_DISCLAIMER,
    };
  }
}
