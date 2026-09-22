import { Injectable, NotFoundException } from '@nestjs/common';
import { EducationAccreditationStatus, EducationLicenseLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EDUCATION_RULE_ENVIRONMENT } from '../education.constants';
import { PUBLIC_EDUCATION_VERIFICATION_FORBIDDEN_RESPONSE_KEYS } from '../education-schema.constants';

export interface PublicEducationVerificationResponse {
  reference: string;
  verificationKind:
    'INSTITUTION_LICENSE' | 'ACCREDITATION' | 'EDUCATOR_LICENSE' | 'CREDENTIAL' | 'UNKNOWN';
  verificationState: 'NOT_FOUND' | 'FOUND';
  ruleEnvironment: string;
  publicFacts: Record<string, string | boolean | null>;
}

@Injectable()
export class PublicEducationVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyAccreditedInstitution(token: string): Promise<PublicEducationVerificationResponse> {
    const record = await this.prisma.educationAccreditationRecord.findUnique({
      where: { publicVerificationToken: token },
      select: { accreditationNumber: true, status: true, organization: { select: { name: true } } },
    });
    if (!record) {
      return this.notFound(token, 'ACCREDITATION');
    }

    const response: PublicEducationVerificationResponse = {
      reference: token,
      verificationKind: 'ACCREDITATION',
      verificationState: 'FOUND',
      ruleEnvironment: EDUCATION_RULE_ENVIRONMENT,
      publicFacts: {
        institutionName: record.organization.name,
        accredited: record.status === EducationAccreditationStatus.ACCREDITED,
        accreditationNumber: record.accreditationNumber,
      },
    };
    this.assertDataMinimized(response);
    return response;
  }

  async verifyInstitutionLicense(token: string): Promise<PublicEducationVerificationResponse> {
    const record = await this.prisma.educationInstitutionLicenseRecord.findUnique({
      where: { publicVerificationToken: token },
      select: {
        licenseNumber: true,
        lifecycleStatus: true,
        organization: { select: { name: true } },
      },
    });
    if (!record) {
      return this.notFound(token, 'INSTITUTION_LICENSE');
    }

    const response: PublicEducationVerificationResponse = {
      reference: token,
      verificationKind: 'INSTITUTION_LICENSE',
      verificationState: 'FOUND',
      ruleEnvironment: EDUCATION_RULE_ENVIRONMENT,
      publicFacts: {
        institutionName: record.organization.name,
        licenseEffective: record.lifecycleStatus === EducationLicenseLifecycleStatus.EFFECTIVE,
        licenseNumber: record.licenseNumber,
      },
    };
    this.assertDataMinimized(response);
    return response;
  }

  async verifyEducatorLicense(token: string): Promise<PublicEducationVerificationResponse> {
    const record = await this.prisma.educatorLicenseRecord.findUnique({
      where: { publicVerificationToken: token },
      select: { licenseNumber: true, lifecycleStatus: true },
    });
    if (!record) {
      return this.notFound(token, 'EDUCATOR_LICENSE');
    }

    const response: PublicEducationVerificationResponse = {
      reference: token,
      verificationKind: 'EDUCATOR_LICENSE',
      verificationState: 'FOUND',
      ruleEnvironment: EDUCATION_RULE_ENVIRONMENT,
      publicFacts: {
        licenseNumber: record.licenseNumber,
        licenseEffective: record.lifecycleStatus === EducationLicenseLifecycleStatus.EFFECTIVE,
      },
    };
    this.assertDataMinimized(response);
    return response;
  }

  async verifyGovernmentCredential(token: string): Promise<PublicEducationVerificationResponse> {
    const record = await this.prisma.educationCredentialReference.findUnique({
      where: { publicVerificationToken: token },
      select: { credentialReference: true, credentialTypeCode: true, isGovernmentRecognized: true },
    });
    if (!record) {
      return this.notFound(token, 'CREDENTIAL');
    }

    const response: PublicEducationVerificationResponse = {
      reference: token,
      verificationKind: 'CREDENTIAL',
      verificationState: 'FOUND',
      ruleEnvironment: EDUCATION_RULE_ENVIRONMENT,
      publicFacts: {
        credentialReference: record.credentialReference,
        credentialTypeCode: record.credentialTypeCode,
        governmentRecognized: record.isGovernmentRecognized,
      },
    };
    this.assertDataMinimized(response);
    return response;
  }

  private notFound(
    reference: string,
    kind: PublicEducationVerificationResponse['verificationKind'],
  ): PublicEducationVerificationResponse {
    return {
      reference,
      verificationKind: kind,
      verificationState: 'NOT_FOUND',
      ruleEnvironment: EDUCATION_RULE_ENVIRONMENT,
      publicFacts: {},
    };
  }

  assertDataMinimized(payload: PublicEducationVerificationResponse): void {
    const serialized = JSON.stringify(payload);
    for (const key of PUBLIC_EDUCATION_VERIFICATION_FORBIDDEN_RESPONSE_KEYS) {
      if (serialized.includes(`"${key}"`)) {
        throw new NotFoundException('Public education verification response policy violation');
      }
    }
  }
}
