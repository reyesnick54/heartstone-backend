import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CivilRegistryAccessService } from './access/civil-registry-access.service';
import { CivilRegistryCertificateService } from './certificates/civil-registry-certificate.service';
import { CivilRegistryController } from './civil-registry.controller';
import { CivilRegistryRegistrationService } from './registration/civil-registry-registration.service';
import { CivilRegistryVerificationService } from './verification/civil-registry-verification.service';
import { PublicCivilRegistryVerificationController } from './verification/public-civil-registry-verification.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [CivilRegistryController, PublicCivilRegistryVerificationController],
  providers: [
    CivilRegistryAccessService,
    CivilRegistryRegistrationService,
    CivilRegistryCertificateService,
    CivilRegistryVerificationService,
  ],
  exports: [
    CivilRegistryAccessService,
    CivilRegistryRegistrationService,
    CivilRegistryCertificateService,
    CivilRegistryVerificationService,
  ],
})
export class CivilRegistryModule {}
