import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { OfficeholderLinksController } from './officeholder-links.controller';
import { OfficeholderLinksService } from './officeholder-links.service';

@Module({
  imports: [IdentityCommonModule],
  controllers: [OfficeholderLinksController],
  providers: [OfficeholderLinksService],
  exports: [OfficeholderLinksService],
})
export class OfficeholderLinksModule {}
