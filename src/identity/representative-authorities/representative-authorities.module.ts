import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { RepresentativeAuthoritiesController } from './representative-authorities.controller';
import { RepresentativeAuthoritiesService } from './representative-authorities.service';

@Module({
  imports: [IdentityCommonModule],
  controllers: [RepresentativeAuthoritiesController],
  providers: [RepresentativeAuthoritiesService],
  exports: [RepresentativeAuthoritiesService],
})
export class RepresentativeAuthoritiesModule {}
