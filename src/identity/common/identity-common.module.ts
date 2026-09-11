import { Module } from '@nestjs/common';

import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from './authority-boundary.service';
import { IdentityValidationService } from './identity-validation.service';

@Module({
  providers: [IdentityValidationService, AuthorityBoundaryService, SecurityAuditService],
  exports: [IdentityValidationService, AuthorityBoundaryService, SecurityAuditService],
})
export class IdentityCommonModule {}
