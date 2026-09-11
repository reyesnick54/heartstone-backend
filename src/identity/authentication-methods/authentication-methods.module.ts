import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { AuthenticationMethodsController } from './authentication-methods.controller';
import { AuthenticationMethodsService } from './authentication-methods.service';

@Module({
  imports: [IdentityCommonModule],
  controllers: [AuthenticationMethodsController],
  providers: [AuthenticationMethodsService],
  exports: [AuthenticationMethodsService],
})
export class AuthenticationMethodsModule {}
