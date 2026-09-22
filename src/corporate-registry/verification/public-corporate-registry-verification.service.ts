import { Injectable } from '@nestjs/common';
import { CorporatePublicVerificationMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CorporateRegistryVerificationDisabledException,
  CorporateRegistryVerificationNotFoundException,
} from '../common/corporate-registry.exceptions';
import { CorporateRegistryConfigurationService } from '../configuration/corporate-registry-configuration.service';
import { CORPORATE_REGISTRY_PUBLIC_VERIFICATION_DISCLAIMER } from '../corporate-registry.constants';

export interface PublicCorporateRegistryVerificationResponse {
  registeredName: string | null;
  registrationReference: string | null;
  status: string;
  jurisdictionCode: string | null;
  verificationTimestamp: string;
  disclaimer: string;
}

@Injectable()
export class PublicCorporateRegistryVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configurationService: CorporateRegistryConfigurationService,
  ) {}

  async verify(reference: string): Promise<PublicCorporateRegistryVerificationResponse> {
    const configuration = await this.configurationService.getDefaultConfiguration();
    if (configuration.publicVerificationMode !== CorporatePublicVerificationMode.MINIMAL_FACTS) {
      throw new CorporateRegistryVerificationDisabledException();
    }

    const profile = await this.prisma.corporateRegistryProfile.findFirst({
      where: {
        OR: [{ publicVerificationReference: reference }, { registrationReference: reference }],
      },
    });

    if (!profile) {
      throw new CorporateRegistryVerificationNotFoundException(reference);
    }

    return {
      registeredName: profile.registeredName,
      registrationReference: profile.registrationReference,
      status: profile.registrationStatus,
      jurisdictionCode: profile.jurisdictionCode,
      verificationTimestamp: new Date().toISOString(),
      disclaimer: CORPORATE_REGISTRY_PUBLIC_VERIFICATION_DISCLAIMER,
    };
  }
}
