import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { InstitutionExternalAuthoritiesController } from './institution-external-authorities.controller';
import { InstitutionExternalAuthoritiesService } from './institution-external-authorities.service';

@Module({
  imports: [GovernmentCommonModule],
  controllers: [InstitutionExternalAuthoritiesController],
  providers: [InstitutionExternalAuthoritiesService],
})
export class InstitutionExternalAuthoritiesModule {}
