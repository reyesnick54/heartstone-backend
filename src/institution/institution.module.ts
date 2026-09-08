import { Module } from '@nestjs/common';

import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';

@Module({
  controllers: [InstitutionController],
import { InstitutionService } from './institution.service';

@Module({
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
