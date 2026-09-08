import { Module } from '@nestjs/common';

import { ExternalAuthorityModule } from '../external-authority/external-authority.module';
import { InstitutionModule } from '../institution/institution.module';
import { InstitutionExternalAuthorityController } from './institution-external-authority.controller';
import { InstitutionExternalAuthorityService } from './institution-external-authority.service';

@Module({
  imports: [InstitutionModule, ExternalAuthorityModule],
  controllers: [InstitutionExternalAuthorityController],
  providers: [InstitutionExternalAuthorityService],
})
export class InstitutionExternalAuthorityModule {}
