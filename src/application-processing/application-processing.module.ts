import { Module } from '@nestjs/common';

import { CasesModule } from './cases/cases.module';

@Module({
  imports: [CasesModule],
  exports: [CasesModule],
})
export class ApplicationProcessingModule {}
