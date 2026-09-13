import {
  AuthorityActionType,
  DecisionOutcomeCode,
  DecisionTypeLifecycleStatus,
} from '@prisma/client';

import { type DecisionCatalogBoundaryService } from '../common/decision-catalog-boundary.service';
import { type DecisionCatalogValidationService } from '../common/decision-catalog-validation.service';
import { DecisionTypeVersionsService } from './decision-type-versions.service';

describe('DecisionTypeVersionsService', () => {
  const validation = {
    assertClientCannotSetLifecycleStatus: jest.fn(),
    ensureDecisionTypeExists: jest.fn(),
    ensureFunctionAuthorityRecordExists: jest.fn(),
    assertRequiredAuthorityActionIsFinalDecision: jest.fn(),
    assertAuthorizedDecisionMakerType: jest.fn(),
    assertRequirementElementsDoNotSubstituteFinalDecision: jest.fn(),
    resolveOutcomeDefinitionIds: jest.fn().mockResolvedValue(['outcome-1']),
  } as unknown as DecisionCatalogValidationService;

  const boundary = {
    assertOutcomeConfigured: jest.fn(),
  } as unknown as DecisionCatalogBoundaryService;

  const prisma = {
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        decisionTypeVersion: {
          create: jest.fn().mockResolvedValue({ id: 'version-1' }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'version-1',
            decisionTypeDefinitionId: 'type-1',
            version: 1,
            functionAuthorityRecordId: 'far-1',
            requiredAuthorityAction: AuthorityActionType.DECIDE,
            governmentServiceVersionId: null,
            governingSourceId: null,
            decisionStandardDescription: 'Standard',
            matterScopeDescription: 'Scope',
            effectiveFrom: null,
            effectiveUntil: null,
            status: DecisionTypeLifecycleStatus.DRAFT,
            requiresFrozenEvidencePacket: false,
            requiredEvidencePacketPurpose: null,
            requiresIndependentReviewer: false,
            requiresConflictCheck: false,
            requiresProfessionalReview: false,
            requiresGovernmentConsultation: false,
            requiresConcurrence: false,
            requiresDualControl: false,
            requiresPanelOrQuorum: false,
            requiresReasons: true,
            requiresNotice: false,
            requiresSignature: true,
            requiresSeal: false,
            signatureTiming: null,
            effectiveDateRule: null,
            publicationStatus: 'NOT_PUBLISHED',
            reviewOrAppealConfiguration: null,
            instrumentIssuanceExpected: false,
            authorizedDecisionMakerType: 'OFFICEHOLDER',
            supersededByVersionId: null,
            institutionallyAcceptedAt: null,
            operationallyActivatedAt: null,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
            permissibleOutcomes: [
              {
                permissibleOutcomeDefinition: { code: DecisionOutcomeCode.APPROVED },
              },
            ],
            requirementElements: [],
          }),
        },
        decisionTypePermissibleOutcome: { createMany: jest.fn() },
        decisionTypeRequirementElement: { createMany: jest.fn() },
      }),
    ),
    decisionTypeVersion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new DecisionTypeVersionsService(prisma as never, validation, boundary);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a version referencing Phase 4 authority and configured outcomes', async () => {
    const assertFinalDecision = jest.spyOn(
      validation,
      'assertRequiredAuthorityActionIsFinalDecision',
    );

    const result = await service.createForDefinition('type-1', {
      version: 1,
      functionAuthorityRecordId: 'far-1',
      requiredAuthorityAction: AuthorityActionType.DECIDE,
      decisionStandardDescription: 'Standard',
      matterScopeDescription: 'Scope',
      permissibleOutcomeCodes: [DecisionOutcomeCode.APPROVED],
    });

    expect(assertFinalDecision).toHaveBeenCalled();
    expect(result.functionAuthorityRecordId).toBe('far-1');
    expect(result.permissibleOutcomeCodes).toEqual([DecisionOutcomeCode.APPROVED]);
    expect(result).not.toHaveProperty('decisionOutcome');
  });

  it('delegates unconfigured outcome rejection to the boundary service', () => {
    const version = {
      permissibleOutcomes: [
        { permissibleOutcomeDefinition: { code: DecisionOutcomeCode.APPROVED } },
      ],
    } as never;
    const assertOutcome = jest.spyOn(boundary, 'assertOutcomeConfigured');

    service.assertConfiguredOutcome(version, DecisionOutcomeCode.REFUSED);
    expect(assertOutcome).toHaveBeenCalled();
  });
});
