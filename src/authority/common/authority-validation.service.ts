import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityClassification } from '@prisma/client';

@Injectable()
export class AuthorityValidationService {
  assertClassificationTransitionAllowed(
    currentClassification: AuthorityClassification,
    nextClassification: AuthorityClassification,
  ): void {
    if (
      currentClassification === AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL &&
      nextClassification === AuthorityClassification.ABSEZ_OWNED
    ) {
      throw new BadRequestException(
        'A retained national function cannot be silently converted to ABSEZ-owned authority',
      );
    }
  }

  ensureExternalAuthorityExistsError(externalAuthorityId: string): NotFoundException {
    return new NotFoundException(`External authority with id "${externalAuthorityId}" was not found`);
  }
}
