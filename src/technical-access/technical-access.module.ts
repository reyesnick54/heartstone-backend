import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { PermissionsGuard } from './authorization/permissions.guard';
import { TechnicalAccessAuditService } from './services/technical-access-audit.service';
import { TechnicalAccessCatalogService } from './services/technical-access-catalog.service';
import { TechnicalPermissionEvaluationService } from './services/technical-permission-evaluation.service';
import { TechnicalRoleAssignmentService } from './services/technical-role-assignment.service';
import { TechnicalAccessController } from './technical-access.controller';

@Global()
@Module({
  imports: [IdentityCommonModule],
  controllers: [TechnicalAccessController],
  providers: [
    TechnicalAccessCatalogService,
    TechnicalPermissionEvaluationService,
    TechnicalAccessAuditService,
    TechnicalRoleAssignmentService,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [
    TechnicalPermissionEvaluationService,
    TechnicalAccessCatalogService,
    TechnicalRoleAssignmentService,
  ],
})
export class TechnicalAccessModule {}
