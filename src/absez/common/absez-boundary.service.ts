import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AbsezZoneEnterpriseActorPersona,
  FunctionAuthorityLifecycleStatus,
  SezBusinessLicenceLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES } from '../absez.constants';

@Injectable()
export class AbsezBoundaryService {
  constructor(private readonly prisma: PrismaService) {}

  assertPaymentDoesNotIssueLicence(actorPersona: AbsezZoneEnterpriseActorPersona): void {
    if (actorPersona === AbsezZoneEnterpriseActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException('Payment receipt does not approve or issue an SEZ business licence');
    }
  }

  assertLicenceRequiresHumanDecision(input: {
    governmentDecisionId?: string;
    officialInstrumentId?: string;
  }): void {
    if (!input.governmentDecisionId) {
      throw new ForbiddenException(
        'SEZ business licence cannot be issued without an authorized human government decision',
      );
    }
    if (!input.officialInstrumentId) {
      throw new ForbiddenException(
        'SEZ business licence must be linked to a signed official instrument',
      );
    }
  }

  assertSuspensionOrRevocationRequiresDecision(governmentDecisionId?: string): void {
    if (!governmentDecisionId) {
      throw new ForbiddenException(
        'SEZ licence suspension or revocation requires consequential government authority',
      );
    }
  }

  assertAiCannotIssueLicence(actorPersona: AbsezZoneEnterpriseActorPersona): void {
    if (actorPersona === AbsezZoneEnterpriseActorPersona.AI_ASSISTANCE) {
      throw new ForbiddenException('AI assistance cannot issue or revoke SEZ business licences');
    }
  }

  async assertAuthorityFunctionIsEffective(functionCode: string, institutionId: string): Promise<void> {
    const record = await this.prisma.functionAuthorityRecord.findFirst({
      where: { code: functionCode, institutionId },
    });
    if (record?.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE) {
      throw new ForbiddenException(
        `Governing authority for ${functionCode} is not recorded as effective for this institution`,
      );
    }
  }

  assertCrossInstitutionBlocked(requestedInstitutionId: string, resourceInstitutionId: string): void {
    if (requestedInstitutionId !== resourceInstitutionId) {
      throw new ForbiddenException('Cross-institution access to SEZ licensing records is denied');
    }
  }

  assertLicenceLifecycleAllowsIssuance(status: SezBusinessLicenceLifecycleStatus): void {
    if (
      status !== SezBusinessLicenceLifecycleStatus.PENDING &&
      status !== SezBusinessLicenceLifecycleStatus.RENEWAL_PENDING &&
      status !== SezBusinessLicenceLifecycleStatus.AMENDMENT_PENDING
    ) {
      throw new ForbiddenException('SEZ licence is not in an issuable lifecycle state');
    }
  }

  consequentialFunctionForSuspend(): string {
    return ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUSPEND;
  }

  consequentialFunctionForRevoke(): string {
    return ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.REVOKE;
  }

  consequentialFunctionForIssue(): string {
    return ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.ISSUE;
  }
}
