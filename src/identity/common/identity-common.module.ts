import { Module } from '@nestjs/common';

import { AuditGovernanceModule } from '../../audit-governance/audit-governance.module';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from './authority-boundary.service';
import { IdentityValidationService } from './identity-validation.service';

@Module({
  imports: [AuditGovernanceModule],
  providers: [IdentityValidationService, AuthorityBoundaryService, SecurityAuditService],
  exports: [IdentityValidationService, AuthorityBoundaryService, SecurityAuditService],
})
export class IdentityCommonModule {}
