import { BadRequestException } from '@nestjs/common';
import { IdentityType, type Office,StructuralLifecycleStatus } from '@prisma/client';

const FORBIDDEN_OFFICE_CODE_PATTERNS = [
  /^VENDOR/i,
  /^SERVICE/i,
  /^AI-/i,
  /^BOT-/i,
  /TECH-ADMIN/i,
] as const;

export function assertInstitutionalOfficeEligible(office: Pick<Office, 'code' | 'status'>): void {
  if (office.status !== StructuralLifecycleStatus.ACTIVE) {
    throw new BadRequestException('Institutional file offices must be active government offices');
  }

  for (const pattern of FORBIDDEN_OFFICE_CODE_PATTERNS) {
    if (pattern.test(office.code)) {
      throw new BadRequestException(
        'Vendor, service, AI, or technical administrator offices cannot hold institutional file ownership',
      );
    }
  }
}

export function assertActorMayInitializeMasterFile(input: {
  actorIdentityType?: IdentityType;
}): void {
  if (input.actorIdentityType === IdentityType.SERVICE) {
    throw new BadRequestException(
      'Service, AI, and automated identities cannot initialize institutional Master Administrative Files',
    );
  }
}
