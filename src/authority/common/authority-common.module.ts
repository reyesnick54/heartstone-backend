import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { AuthorityAuditService } from './authority-audit.service';
import { AuthorityValidationService } from './authority-validation.service';
import { SourceFoundationEvaluatorService } from './source-foundation-evaluator.service';

@Module({
  imports: [IdentityCommonModule],
  providers: [AuthorityValidationService, AuthorityAuditService, SourceFoundationEvaluatorService],
  exports: [AuthorityValidationService, AuthorityAuditService, SourceFoundationEvaluatorService],
})
export class AuthorityCommonModule {}
