import { Global, Module } from '@nestjs/common';

import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { TechnicalPermissionService } from './technical-permission.service';

@Global()
@Module({
  imports: [IdentityCommonModule],
  providers: [TechnicalPermissionService],
  exports: [TechnicalPermissionService],
})
export class TechnicalPermissionModule {}
