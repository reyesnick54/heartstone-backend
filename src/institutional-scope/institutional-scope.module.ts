import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { ActorContextService } from './actor-context.service';
import { InstitutionalScopeGuard } from './guards/institutional-scope.guard';
import { InstitutionalScopeService } from './institutional-scope.service';
import { ResourceAccessService } from './resource-access.service';
import { ResourceOwnershipResolver } from './resource-ownership.resolver';
import { SubjectRecordAccessService } from './subject-record-access.service';

@Global()
@Module({
  imports: [DatabaseModule, IdentityCommonModule],
  providers: [
    ResourceOwnershipResolver,
    ActorContextService,
    InstitutionalScopeService,
    ResourceAccessService,
    SubjectRecordAccessService,
    InstitutionalScopeGuard,
  ],
  exports: [
    ResourceOwnershipResolver,
    ActorContextService,
    InstitutionalScopeService,
    ResourceAccessService,
    SubjectRecordAccessService,
    InstitutionalScopeGuard,
  ],
})
export class InstitutionalScopeModule {}
