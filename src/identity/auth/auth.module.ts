import { Module } from '@nestjs/common';

import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActorContextModule } from './context/actor-context.module';
import { ClientIdentitySubstitutionGuard } from './guards/client-identity-substitution.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Module({
  imports: [SessionsModule, ActorContextModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, ClientIdentitySubstitutionGuard],
  exports: [
    AuthService,
    SessionAuthGuard,
    ClientIdentitySubstitutionGuard,
    ActorContextModule,
    SessionsModule,
  ],
})
export class AuthModule {}
