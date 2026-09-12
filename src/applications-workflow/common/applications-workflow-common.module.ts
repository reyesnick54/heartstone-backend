import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, AuthorityModule],
  exports: [DatabaseModule, AuthorityModule],
})
export class ApplicationsWorkflowCommonModule {}
