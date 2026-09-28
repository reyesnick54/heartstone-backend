import { ForbiddenException, Injectable } from '@nestjs/common';
import { CannabisAdministrationActorPersona, CannabisAdministrationDataClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CANNABIS_REASON_CODES } from '../cannabis-administration.constants';
import { CannabisAdministrationBoundaryService } from './cannabis-administration-boundary.service';

export interface CannabisRegulatedEntityAccessContext {
  accessorIdentityId: string;
  regulatedEntityId: string;
  actorPersona: CannabisAdministrationActorPersona;
  endpoint: string;
  hasRegulatoryOfficerScope: boolean;
  hasBeneficialOwnershipScope: boolean;
}

@Injectable()
export class CannabisAdministrationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CannabisAdministrationBoundaryService,
  ) {}

  async assertRegulatedEntityAccess(context: CannabisRegulatedEntityAccessContext): Promise<void> {
    this.boundary.assertRegulatoryFileAccessDenied(context.actorPersona);

    const entity = await this.prisma.cannabisRegulatedEntityReference.findUnique({
      where: { id: context.regulatedEntityId },
    });
    if (!entity) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.CROSS_ENTITY_ACCESS_DENIED);
    }

    let granted = context.hasRegulatoryOfficerScope;
    let reasonCode: string | undefined;

    if (entity.dataClassification === CannabisAdministrationDataClassification.BENEFICIAL_OWNERSHIP_RESTRICTED) {
      granted = context.hasBeneficialOwnershipScope;
      if (!granted) {
        reasonCode = CANNABIS_REASON_CODES.BENEFICIAL_OWNERSHIP_ACCESS_DENIED;
      }
    } else if (!granted) {
      reasonCode = CANNABIS_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED;
    }

    await this.prisma.cannabisDataAccessAudit.create({
      data: {
        accessorIdentityId: context.accessorIdentityId,
        regulatedEntityId: context.regulatedEntityId,
        classification: entity.dataClassification,
        endpoint: context.endpoint,
        granted,
        reasonCode,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        reasonCode ?? CANNABIS_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED,
      );
    }
  }
}
