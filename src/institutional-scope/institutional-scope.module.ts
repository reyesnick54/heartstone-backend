import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { ActorContextService } from './actor-context.service';
import { InstitutionalScopeGuard } from './guards/institutional-scope.guard';
import { InstitutionalScopeService } from './institutional-scope.service';
import { ResourceAccessService } from './resource-access.service';
import { ResourceOwnershipResolver } from './resource-ownership.resolver';

@Global()
@Module({
  imports: [DatabaseModule, IdentityCommonModule, ActorContextModule],
  providers: [
    ResourceOwnershipResolver,
    ActorContextService,
    InstitutionalScopeService,
    ResourceAccessService,
    InstitutionalScopeGuard,
  ],
  exports: [
    ResourceOwnershipResolver,
    ActorContextService,
    InstitutionalScopeService,
    ResourceAccessService,
    InstitutionalScopeGuard,
  ],
})
export class InstitutionalScopeModule {}
