import { Module } from '@nestjs/common';

import { ExternalAuthoritiesController } from './external-authorities.controller';
import { ExternalAuthoritiesService } from './external-authorities.service';

@Module({
  controllers: [ExternalAuthoritiesController],
  providers: [ExternalAuthoritiesService],
  exports: [ExternalAuthoritiesService],
})
export class ExternalAuthoritiesModule {}
