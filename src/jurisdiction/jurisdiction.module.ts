import { Module } from '@nestjs/common';

import { JurisdictionController } from './jurisdiction.controller';
import { JurisdictionService } from './jurisdiction.service';

@Module({
  controllers: [JurisdictionController],
  providers: [JurisdictionService],
  exports: [JurisdictionService],
})
export class JurisdictionModule {}
