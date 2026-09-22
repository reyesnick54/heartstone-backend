import { Injectable } from '@nestjs/common';
import { PropertyCertificateStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyCertificateRegistryVersionException } from '../common/property-registry.exceptions';
import { PropertyRegistryBoundaryService } from '../common/property-registry-boundary.service';

@Injectable()
export class PropertyCertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryBoundaryService,
  ) {}

  async issueCertificate(input: { parcelId: string; issuedByIdentityId: string }) {
    const parcel = await this.prisma.propertyParcel.findUniqueOrThrow({
      where: { id: input.parcelId },
    });

    this.boundary.assertCertificateReferencesRegistryVersion(parcel.registryVersion);

    const certificateReference = `PROP-CERT-${parcel.parcelReference}-${String(parcel.registryVersion)}`;
    return this.prisma.propertyRegistryCertificate.create({
      data: {
        parcelId: parcel.id,
        certificateReference,
        status: PropertyCertificateStatus.ISSUED,
        registryVersionNumber: parcel.registryVersion,
        issuedAt: new Date(),
        issuedByIdentityId: input.issuedByIdentityId,
      },
    });
  }

  assertIssuedCertificateReferencesRegistryVersion(
    certificate: { registryVersionNumber: number },
    parcel: { registryVersion: number },
  ): void {
    if (certificate.registryVersionNumber !== parcel.registryVersion) {
      throw new PropertyCertificateRegistryVersionException();
    }
  }
}
