import { ForbiddenException, Injectable } from '@nestjs/common';
import { ServicePackExportRestriction } from '@prisma/client';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';

export interface ServicePackExportAccessTarget {
  institutionId: string;
  exportRestriction: ServicePackExportRestriction;
  responsibleOwnerIdentityId?: string | null;
}

@Injectable()
export class ServicePackPortabilityAccessService {
  assertCanExport(actor: ActorContext, target: ServicePackExportAccessTarget): void {
    if (target.exportRestriction === ServicePackExportRestriction.TEMPLATE_PORTABLE) {
      return;
    }

    if (
      target.responsibleOwnerIdentityId &&
      target.responsibleOwnerIdentityId === actor.identityId
    ) {
      return;
    }

    const hasInstitutionScope = actor.institutionContexts.some(
      (scope) => scope.institutionId === target.institutionId,
    );

    if (!hasInstitutionScope) {
      throw new ForbiddenException(
        'Export of institution-restricted service packs requires institutional scope on the owning institution',
      );
    }
  }
}
