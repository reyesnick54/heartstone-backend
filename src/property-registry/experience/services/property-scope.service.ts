import { Injectable } from '@nestjs/common';
import { PropertyAccessActorKind } from '@prisma/client';

import { PropertyRegistryAccessService } from '../../common/property-registry-access.service';

@Injectable()
export class PropertyScopeService {
  constructor(private readonly access: PropertyRegistryAccessService) {}

  listCitizenParcelIds(identityId: string) {
    return this.access.listAuthorizedParcelIdsForIdentity(identityId);
  }

  listOrganizationParcelIds(organizationId: string) {
    return this.access.listAuthorizedParcelIdsForOrganization(organizationId);
  }

  assertCitizenParcelAccess(identityId: string, parcelId: string, endpoint: string) {
    return this.access.assertParcelAccess({
      accessorIdentityId: identityId,
      parcelId,
      actorKind: PropertyAccessActorKind.OWNER,
      endpoint,
    });
  }
}
