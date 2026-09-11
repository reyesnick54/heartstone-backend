import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

@Module({
  imports: [IdentityCommonModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
