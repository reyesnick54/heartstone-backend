import { Module } from '@nestjs/common';

import { ExternalAuthorityController } from './external-authority.controller';
import { ExternalAuthorityService } from './external-authority.service';

@Module({
  controllers: [ExternalAuthorityController],
  providers: [ExternalAuthorityService],
  exports: [ExternalAuthorityService],
})
export class ExternalAuthorityModule {}
