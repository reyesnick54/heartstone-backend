import { Injectable } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  FunctionAuthorityLifecycleStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { TRANSPORTATION_TEMPLATE_AUTHORITY } from '../../transportation.constants';

export interface TransportationActionCandidate {
  actionKey: string;
  label: string;
  authorityFunctionCode: string;
  authorityAction: AuthorityActionType;
}

const OFFICIAL_TRANSPORT_ACTIONS: TransportationActionCandidate[] = [
  {
    actionKey: 'approve_driver_license_issuance',
    label: 'Approve driver license issuance',
    authorityFunctionCode: TRANSPORTATION_TEMPLATE_AUTHORITY.licenseIssue,
    authorityAction: AuthorityActionType.ISSUE,
  },
  {
    actionKey: 'approve_vehicle_registration',
    label: 'Approve vehicle registration',
    authorityFunctionCode: TRANSPORTATION_TEMPLATE_AUTHORITY.registrationDecide,
    authorityAction: AuthorityActionType.APPROVE,
  },
  {
    actionKey: 'approve_vehicle_transfer',
    label: 'Approve vehicle transfer',
    authorityFunctionCode: TRANSPORTATION_TEMPLATE_AUTHORITY.transferDecide,
    authorityAction: AuthorityActionType.DECIDE,
  },
];

@Injectable()
export class TransportationAvailableActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async evaluateOfficialActions(context: ResolvedOfficialContext) {
    const actions: {
      actionKey: string;
      label: string;
      available: boolean;
      unavailableReason: string | null;
    }[] = [];

    for (const candidate of OFFICIAL_TRANSPORT_ACTIONS) {
      const functionAuthority = await this.prisma.functionAuthorityRecord.findFirst({
        where: { code: candidate.authorityFunctionCode },
        orderBy: { createdAt: 'desc' },
      });

      if (!functionAuthority) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Authority function is not configured',
        });
        continue;
      }

      if (functionAuthority.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Authority function is suspended',
        });
        continue;
      }

      const evaluation = await this.authorityEvaluation.evaluate({
        identityId: context.identityId,
        functionAuthorityRecordId: functionAuthority.id,
        action: candidate.authorityAction,
        officeholderId: context.scope.primaryAppointment?.officeholderId,
        officeId: context.scope.primaryAppointment?.officeId,
        appointmentId: context.scope.primaryAppointment?.appointmentId,
        delegationId: context.scope.activeDelegations[0]?.delegationId,
        priorActions: [],
        hasSecondApproval: false,
      });

      actions.push({
        actionKey: candidate.actionKey,
        label: candidate.label,
        available: evaluation.outcome === AuthorityEvaluationOutcome.ALLOW,
        unavailableReason:
          evaluation.outcome === AuthorityEvaluationOutcome.ALLOW
            ? null
            : evaluation.summary || 'Authority evaluation denied',
      });
    }

    return actions;
  }
}
