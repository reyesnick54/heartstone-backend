import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { InstitutionalScopeGuard } from './guards/institutional-scope.guard';
import { InstitutionalActorScopeService } from './institutional-actor-scope.service';
import { InstitutionalScopeService } from './institutional-scope.service';
import { ResourceAccessService } from './resource-access.service';
import { ResourceOwnershipResolver } from './resource-ownership.resolver';

@Global()
@Module({
  imports: [DatabaseModule, IdentityCommonModule, ActorContextModule],
  providers: [
    ResourceOwnershipResolver,
    InstitutionalActorScopeService,
    InstitutionalScopeService,
    ResourceAccessService,
    InstitutionalScopeGuard,
  ],
  exports: [
    ResourceOwnershipResolver,
    InstitutionalActorScopeService,
    InstitutionalScopeService,
    ResourceAccessService,
    InstitutionalScopeGuard,
  ],
})
export class InstitutionalScopeModule {}
