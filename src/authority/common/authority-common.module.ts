import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { AuthorityAuditService } from './authority-audit.service';
import { AuthorityValidationService } from './authority-validation.service';

@Module({
  imports: [IdentityCommonModule],
  providers: [AuthorityValidationService, AuthorityAuditService],
  exports: [AuthorityValidationService, AuthorityAuditService],
})
export class AuthorityCommonModule {}
