import { Module } from '@nestjs/common';

import { AuthorityValidationService } from './authority-validation.service';

@Module({
  providers: [AuthorityValidationService],
  exports: [AuthorityValidationService],
})
export class AuthorityCommonModule {}
