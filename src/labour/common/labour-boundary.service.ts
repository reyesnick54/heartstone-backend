import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { LabourActorPersona } from '@prisma/client';

import {
  FORBIDDEN_AI_LABOUR_ACTIONS,
  FORBIDDEN_EMPLOYER_SELF_AUTHORIZATION_ACTIONS,
  type LabourEmployerWorkforceScope,
} from '../labour.constants';

@Injectable()
export class LabourBoundaryService {
  assertEmploymentContractDoesNotCreateWorkPermit(input: {
    doesNotIssueWorkPermit: boolean;
    workPermitsCreated: number;
  }): void {
    if (!input.doesNotIssueWorkPermit && input.workPermitsCreated > 0) {
      throw new BadRequestException(
        'Employment contract reference must not create or issue a work permit',
      );
    }
    if (input.workPermitsCreated > 0) {
      throw new BadRequestException(
        'Linking an employment contract reference cannot create work authorization',
      );
    }
  }

  assertEmployerCannotSelfAuthorizeWorker(actorPersona: LabourActorPersona, action: string): void {
    if (
      actorPersona === LabourActorPersona.EMPLOYER &&
      FORBIDDEN_EMPLOYER_SELF_AUTHORIZATION_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`Employer cannot self-authorize workers: ${action}`);
    }
  }

  assertWorkPermitDoesNotCreateResidency(input: {
    doesNotCreateResidency: boolean;
    residencyRecordsCreated: number;
  }): void {
    if (input.residencyRecordsCreated > 0) {
      throw new BadRequestException(
        'Labour work permit records must not create immigration residency status',
      );
    }
    if (!input.doesNotCreateResidency && input.residencyRecordsCreated > 0) {
      throw new BadRequestException(
        'Work permit must remain distinct from residency determination',
      );
    }
  }

  assertResidencyDoesNotCreateWorkPermit(workPermitsCreatedFromResidency: number): void {
    if (workPermitsCreatedFromResidency > 0) {
      throw new BadRequestException(
        'Immigration residency determination must not automatically create labour work authorization',
      );
    }
  }

  assertPaymentDoesNotApproveWorkPermit(actorPersona: LabourActorPersona): void {
    if (actorPersona === LabourActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException('Payment receipt does not approve or issue a work permit');
    }
  }

  assertAiCannotApproveWorkPermit(actorPersona: LabourActorPersona, action: string): void {
    if (
      actorPersona === LabourActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_LABOUR_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`AI assistance cannot perform labour action: ${action}`);
    }
  }

  assertTechnicalAdminCannotCreateWorkAuthorization(actorPersona: LabourActorPersona): void {
    if (actorPersona === LabourActorPersona.TECHNICAL_ADMIN) {
      throw new ForbiddenException(
        'Technical administration cannot create or alter authoritative work authorization',
      );
    }
  }

  assertComplaintIsNotVerifiedViolation(
    isVerifiedViolation: boolean,
    summary?: string | null,
  ): void {
    if (isVerifiedViolation) {
      throw new BadRequestException(
        'Employment complaints record allegations only; violation cannot be marked verified at filing',
      );
    }
    if (summary?.toLowerCase().includes('violation proven')) {
      throw new BadRequestException('Complaint narrative must not assert a proven violation');
    }
  }

  assertInspectionFindingIsNotFinalDecision(isFinalEnforcementDecision: boolean): void {
    if (isFinalEnforcementDecision) {
      throw new BadRequestException(
        'Labour inspection references record findings separately from final enforcement decisions',
      );
    }
  }

  assertNoDestructiveRelationshipOverwrite(
    existingHistoryCount: number,
    overwriteRequested: boolean,
  ): void {
    if (overwriteRequested && existingHistoryCount > 0) {
      throw new BadRequestException(
        'Employment relationship history must be preserved; destructive overwrite is forbidden',
      );
    }
  }

  assertNoDestructiveWorkPermitStatusOverwrite(
    existingPermitRecordId: string | null | undefined,
    destructiveOverwriteRequested: boolean,
  ): void {
    if (destructiveOverwriteRequested && existingPermitRecordId) {
      throw new BadRequestException(
        'Work permit status must be superseded with history entries; destructive overwrite is forbidden',
      );
    }
  }

  assertCrossWorkerAccessBlocked(requesterIdentityId: string, workerIdentityId: string): void {
    if (requesterIdentityId !== workerIdentityId) {
      throw new ForbiddenException('Cross-worker labour record access is not permitted');
    }
  }

  assertEmployerWorkforceScope(
    scope: LabourEmployerWorkforceScope,
    requested: keyof LabourEmployerWorkforceScope,
  ): void {
    if (!scope[requested]) {
      throw new ForbiddenException(`Employer workforce access denied for scope: ${requested}`);
    }
  }

  rejectClientForgedWorkAuthorizationFields(payload: Record<string, unknown>): void {
    const forbidden = [
      'lifecycleStatus',
      'governmentDecisionId',
      'officialInstrumentId',
      'isVerifiedViolation',
    ];
    for (const field of forbidden) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set authoritative labour field "${field}"`);
      }
    }
  }
}
