import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { OidcAuthService } from './oidc-auth.service';

@Module({
  imports: [IdentityCommonModule],
  providers: [OidcAuthService],
  exports: [OidcAuthService],
})
export class OidcModule {}
