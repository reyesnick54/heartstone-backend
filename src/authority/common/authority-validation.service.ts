import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityClassification } from '@prisma/client';

import { normalizeAuthorityClassification } from '../../platform-core/institution-neutral-enums.util';

@Injectable()
export class AuthorityValidationService {
  assertClassificationTransitionAllowed(
    currentClassification: AuthorityClassification,
    nextClassification: AuthorityClassification,
  ): void {
    const normalizedNext = normalizeAuthorityClassification(nextClassification);
    if (
      currentClassification === AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL &&
      normalizedNext === AuthorityClassification.INSTITUTION_OWNED
    ) {
      throw new BadRequestException(
        'A retained national function cannot be silently converted to institution-owned authority',
      );
    }
  }

  ensureExternalAuthorityExistsError(externalAuthorityId: string): NotFoundException {
    return new NotFoundException(
      `External authority with id "${externalAuthorityId}" was not found`,
    );
  }
}
