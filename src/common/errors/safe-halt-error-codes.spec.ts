import {
  BadRequestException,
  type ExecutionContext,
  ForbiddenException,
  type HttpException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  DispositionRequestStatus,
  IdentityType,
  LegalHoldTargetType,
  SourceDiscrepancyStatus,
} from '@prisma/client';

import { SafeHaltedWorkflowException } from '../../application-processing/common/exceptions/application-processing.exceptions';
import { buildConsequentialActionDenial } from '../../authority/consequential-action/consequential-action-denial.util';
import { type AuthorityEvaluationResponseDto } from '../../authority/evaluation/dto/authority-evaluation-response.dto';
import { AuthorityEvaluationStatus } from '../../authority/policy/authority-evaluation-status.enum';
import { type PrismaService } from '../../database/prisma.service';
import { type ArchivalTransfersService } from '../../evidence-records/archival/archival-transfers.service';
import { RecordDispositionService } from '../../evidence-records/disposition/record-disposition.service';
import { DISPOSITION_APPROVAL_PERMISSION } from '../../evidence-records/evidence-records.constants';
import { type LegalHoldsService } from '../../evidence-records/legal-hold/legal-holds.service';
import { type PreservationCollectionsService } from '../../evidence-records/preservation/preservation-collections.service';
import { SourceDiscrepancyService } from '../../operational-support/integrations/source-discrepancy.service';
import { ProductionReadinessBoundaryService } from '../../production-readiness/common/production-readiness-boundary.service';
import { PRODUCTION_READINESS_REASON_CODES } from '../../production-readiness/production-readiness.constants';
import { RouteAccessEnforcementGuard } from '../../security/guards/route-access-enforcement.guard';
import { RouteClass } from '../../security/route-class.enum';
import { API_ERROR_CODES } from './api-error-codes';

function responseOf(error: unknown): Record<string, unknown> {
  return (error as HttpException).getResponse() as Record<string, unknown>;
}

function evaluation(safeHalt: boolean): AuthorityEvaluationResponseDto {
  return {
    evaluationId: 'eval-1',
    functionAuthorityRecordId: 'far-1',
    identityId: 'identity-1',
    action: AuthorityActionType.APPROVE,
    outcome: AuthorityEvaluationOutcome.DENY,
    status: AuthorityEvaluationStatus.NOT_AUTHORIZED,
    explanationCodes: ['DENY'],
    summary: 'Denied',
    safeHalt,
    requiresRevalidation: false,
    evaluatedAt: new Date(),
  };
}

describe('SAFE_HALT error code', () => {
  describe('authority evaluation denials', () => {
    it('adds code SAFE_HALT when the evaluation halted processing', () => {
      const denial = buildConsequentialActionDenial(evaluation(true));

      expect(denial.code).toBe(API_ERROR_CODES.SAFE_HALT);
      expect(denial.safeHalt).toBe(true);
      expect(denial.message).toBe(
        'Consequential action blocked: authority evaluation did not permit this action.',
      );
      expect(responseOf(new ForbiddenException(denial))).toMatchObject({ code: 'SAFE_HALT' });
    });

    it('adds no code to an ordinary denial', () => {
      const denial = buildConsequentialActionDenial(evaluation(false));

      expect(denial).not.toHaveProperty('code');
    });
  });

  it('safe-halted workflows keep 403 and their message', () => {
    const error = new SafeHaltedWorkflowException();

    expect(error.getStatus()).toBe(403);
    expect(error.message).toBe('Workflow is safe-halted and cannot continue normal processing');
    expect(responseOf(error)).toEqual({
      statusCode: 403,
      message: 'Workflow is safe-halted and cannot continue normal processing',
      error: 'Forbidden',
      code: 'SAFE_HALT',
    });
  });

  it('AI cannot override safe halt keeps its message', () => {
    const boundary = new ProductionReadinessBoundaryService();

    let caught: unknown;
    try {
      boundary.assertAiCannotOverrideSafeHalt(true, true);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ForbiddenException);
    expect((caught as ForbiddenException).message).toBe(
      PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_OVERRIDE_SAFE_HALT,
    );
    expect(responseOf(caught)).toMatchObject({ code: 'SAFE_HALT' });
  });

  describe('route access enforcement', () => {
    function context(method: string): ExecutionContext {
      return {
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            route: { path: '/api/v1/test' },
            session: { identityId: 'svc-1' },
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('missing route classification is a safe halt', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
      const guard = new RouteAccessEnforcementGuard(
        reflector as unknown as Reflector,
        {} as PrismaService,
      );

      const error = await guard.canActivate(context('GET')).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).message).toBe(
        'Route access classification metadata is required but missing (safe halt).',
      );
      expect(responseOf(error)).toMatchObject({ code: 'SAFE_HALT' });
    });

    it('non-human identity on a restricted mutation is a safe halt', async () => {
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValueOnce(false)
          .mockReturnValue({ routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE }),
      };
      const prisma = {
        identity: { findUnique: jest.fn().mockResolvedValue({ type: IdentityType.SERVICE }) },
      };
      const guard = new RouteAccessEnforcementGuard(
        reflector as unknown as Reflector,
        prisma as unknown as PrismaService,
      );

      const error = await guard.canActivate(context('POST')).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(responseOf(error)).toMatchObject({ code: 'SAFE_HALT' });
    });
  });

  it('disposition authorisation blocked by safe-halt conditions keeps 400 and its message', async () => {
    const prisma = {
      recordDispositionRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'req-1',
          status: DispositionRequestStatus.SAFE_HALTED,
          safeHaltReasons: ['LEGAL_HOLD_ACTIVE'],
          requestReference: 'DISP-1',
          targetType: LegalHoldTargetType.DOCUMENT,
          targetReference: 'DOC-1',
        }),
      },
    };
    const service = new RecordDispositionService(
      prisma as unknown as PrismaService,
      {} as LegalHoldsService,
      {} as PreservationCollectionsService,
      {} as ArchivalTransfersService,
    );

    const error = await service
      .authorize('req-1', {
        authorizedByIdentityId: 'identity-1',
        authorityReference: 'AUTH-1',
        method: 'SECURE_DESTRUCTION',
        actorPermissions: [DISPOSITION_APPROVAL_PERMISSION],
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).message).toBe(
      'Cannot authorize disposition while safe-halt conditions remain',
    );
    expect(responseOf(error)).toMatchObject({ statusCode: 400, code: 'SAFE_HALT' });
  });

  it('resolving a safe-halted source discrepancy keeps 400 and its message', async () => {
    const prisma = {
      sourceDiscrepancy: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'disc-1', status: SourceDiscrepancyStatus.SAFE_HALTED }),
      },
    };
    const service = new SourceDiscrepancyService(prisma as unknown as PrismaService);

    const error = await service
      .resolveDiscrepancy('disc-1', 'ACCEPT_EXTERNAL')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).message).toBe(
      'Material discrepancies in SAFE_HALTED status require institutional review before resolution',
    );
    expect(responseOf(error)).toMatchObject({ code: 'SAFE_HALT' });
  });
});
