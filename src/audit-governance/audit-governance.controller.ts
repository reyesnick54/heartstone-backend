import { Controller, Get, Param, Query } from '@nestjs/common';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { DenyByDefaultAdministrative } from '../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../technical-access/constants/permission-codes.constants';
import { GovernedConfigurationChangeService } from './configuration/governed-configuration-change.service';
import { GovernmentAuditLedgerVerificationService } from './ledger/government-audit-ledger-verification.service';

@Controller('audit-governance')
@DenyByDefaultAdministrative()
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Platform audit and configuration governance read surfaces',
  authorityRequirement: 'Technical audit:read and configuration permissions only',
  actorSource: 'Authenticated session identity',
  primarySecurityInvariant: 'Audit ledger integrity verification does not mutate history',
})
export class AuditGovernanceController {
  constructor(
    private readonly verification: GovernmentAuditLedgerVerificationService,
    private readonly governedConfiguration: GovernedConfigurationChangeService,
  ) {}

  @Get('ledger/streams/:ledgerStreamKey/verify')
  @RequirePermissions(PermissionCodes.AUDIT_READ)
  async verifyStream(
    @Param('ledgerStreamKey') ledgerStreamKey: string,
    @Query('fromSequence') fromSequence?: string,
    @Query('toSequence') toSequence?: string,
  ) {
    return this.verification.verifyStream({
      ledgerStreamKey,
      fromSequence: fromSequence ? BigInt(fromSequence) : undefined,
      toSequence: toSequence ? BigInt(toSequence) : undefined,
    });
  }

  @Get('institutions/:institutionId/ledger/verify')
  @RequirePermissions(PermissionCodes.AUDIT_READ)
  async verifyInstitution(@Param('institutionId') institutionId: string) {
    return this.verification.verifyInstitution(institutionId);
  }

  @Get('institutions/:institutionId/configuration/effective')
  @RequirePermissions(PermissionCodes.CONFIGURATION_ACTIVATE)
  async resolveEffectiveConfiguration(
    @Param('institutionId') institutionId: string,
    @Query('domain') domain: string,
    @Query('key') key: string,
    @Query('at') at?: string,
  ) {
    const resolved = await this.governedConfiguration.resolveEffectiveConfiguration({
      institutionId,
      configurationDomain: domain as never,
      configurationKey: key,
      at: at ? new Date(at) : new Date(),
    });

    return resolved ?? { effective: false };
  }
}
