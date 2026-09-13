import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import {
  InstrumentJurisdictionScope,
  InstrumentLifecycleDecisionType,
  InstrumentLifecycleStatus,
} from '@prisma/client';

import { PROTECTED_INSTRUMENT_STATUS_FIELDS, TECHNICAL_ADMIN_ROLE_MARKER } from '../instruments.constants';

@Injectable()
export class InstrumentLifecycleBoundaryService {
  assertClientCannotPatchInstrumentStatus(payload: Record<string, unknown>): void {
    for (const field of PROTECTED_INSTRUMENT_STATUS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Instrument lifecycle status cannot be changed via ordinary PATCH (${field})`,
        );
      }
    }
  }

  assertClericalCorrectionScope(input: {
    altersDecisionOutcome?: boolean;
    altersScope?: boolean;
    altersRights?: boolean;
    altersObligations?: boolean;
    altersMaterialCondition?: boolean;
    altersHolder?: boolean;
    altersLegalEffect?: boolean;
  }): void {
    const violations: string[] = [];

    if (input.altersDecisionOutcome) {
      violations.push('decision outcome');
    }
    if (input.altersScope) {
      violations.push('scope');
    }
    if (input.altersRights) {
      violations.push('rights');
    }
    if (input.altersObligations) {
      violations.push('obligations');
    }
    if (input.altersMaterialCondition) {
      violations.push('material condition');
    }
    if (input.altersHolder) {
      violations.push('holder');
    }
    if (input.altersLegalEffect) {
      violations.push('legal effect');
    }

    if (violations.length > 0) {
      throw new BadRequestException(
        `Clerical correction cannot alter substantive elements: ${violations.join(', ')}. Follow substantive decision process.`,
      );
    }
  }

  assertTechnicalAdminCannotCreateSuspensionDecision(input: {
    actorRoleMarker?: string;
    isCreatingDecision: boolean;
  }): void {
    if (
      input.isCreatingDecision &&
      input.actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER
    ) {
      throw new ForbiddenException(
        'Technical administrators may execute approved suspension status changes but cannot create suspension decisions',
      );
    }
  }

  assertAbsezRevocationNotNational(input: {
    jurisdictionScope: InstrumentJurisdictionScope;
    representsNationalRevocation: boolean;
  }): void {
    if (
      input.jurisdictionScope === InstrumentJurisdictionScope.ABSEZ &&
      input.representsNationalRevocation
    ) {
      throw new BadRequestException(
        'ABSEZ status revocation cannot be represented as revocation of a national government license',
      );
    }
  }

  assertDecisionTypeMatchesLifecycleAction(
    decisionType: InstrumentLifecycleDecisionType,
    expectedTypes: InstrumentLifecycleDecisionType[],
  ): void {
    if (!expectedTypes.includes(decisionType)) {
      throw new BadRequestException(
        `Government decision type ${decisionType} is not authorized for this lifecycle action`,
      );
    }
  }

  assertInstrumentStatusAllowsAction(
    lifecycleStatus: InstrumentLifecycleStatus,
    allowedStatuses: InstrumentLifecycleStatus[],
    action: string,
  ): void {
    if (!allowedStatuses.includes(lifecycleStatus)) {
      throw new BadRequestException(
        `Instrument status ${lifecycleStatus} does not permit ${action}`,
      );
    }
  }
}
