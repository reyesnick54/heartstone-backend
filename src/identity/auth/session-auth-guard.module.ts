import { Global, Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ActorContextModule } from './context/actor-context.module';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { MfaAssuranceService } from './mfa/mfa-assurance.service';
import { StepUpAuthService } from './step-up/step-up-auth.service';

/**
 * Minimal module exporting SessionAuthGuard and its dependencies for feature modules.
 */
@Global()
@Module({
  imports: [IdentityCommonModule, SessionsModule, ActorContextModule],
  providers: [MfaAssuranceService, StepUpAuthService, SessionAuthGuard],
  exports: [
    SessionAuthGuard,
    StepUpAuthService,
    MfaAssuranceService,
    SessionsModule,
    ActorContextModule,
  ],
})
export class SessionAuthGuardModule {}
