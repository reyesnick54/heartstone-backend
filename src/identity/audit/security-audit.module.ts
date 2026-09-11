import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SecurityAuditService } from './security-audit.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
