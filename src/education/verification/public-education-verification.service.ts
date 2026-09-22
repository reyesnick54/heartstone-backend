import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';

@Injectable()
export class PublicEducationVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async verifyCredentialPublicly(credentialReference: string) {
    const credential = await this.prisma.academicCredential.findUnique({
      where: { credentialReference },
    });
    if (!credential) {
      throw new NotFoundException('Academic credential not found');
    }

    const payload = {
      credentialReference: credential.credentialReference,
      lifecycleStatus: credential.lifecycleStatus,
      issuedAt: credential.issuedAt,
      verificationOutcome: 'REFERENCE_LOCATED',
      grades: 'SHOULD_NOT_APPEAR',
      transcript: 'SHOULD_NOT_APPEAR',
      studentIdentityId: 'SHOULD_NOT_APPEAR',
    };

    return this.boundary.sanitizePublicVerificationPayload(payload);
  }
}
