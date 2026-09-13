import { AuthorityActionType, CaseStatus, DecisionOutcomeCode } from '@prisma/client';

import { DecisionCatalogBoundaryService } from './common/decision-catalog-boundary.service';
import { DecisionCatalogValidationService } from './common/decision-catalog-validation.service';
describe('Phase 8A decision catalog must-fail invariants', () => {
  const boundary = new DecisionCatalogBoundaryService({} as never);
  const validation = new DecisionCatalogValidationService({} as never);

  it('rejects recommendation as required final authority action', () => {
    expect(() => {
      validation.assertRequiredAuthorityActionIsFinalDecision(AuthorityActionType.RECOMMEND);
    }).toThrow(/RECOMMENDATION_NOT_FINAL_DECISION|final decision/i);
  });

  it('rejects non-decision authority actions such as VERIFY', () => {
    expect(() => {
      validation.assertRequiredAuthorityActionIsFinalDecision(AuthorityActionType.VERIFY);
    }).toThrow(/NON_DECISION_AUTHORITY_ACTION|DECIDE or APPROVE|preparatory action/i);
  });

  it('rejects recommendation elements configured as equivalent to final decision', () => {
    expect(() => {
      validation.assertRequirementElementsDoNotSubstituteFinalDecision([
        {
          elementType: 'RECOMMENDATION',
          configuration: { equivalentToDecision: true },
        },
      ]);
    }).toThrow(/RECOMMENDATION_ELEMENT_NOT_FINAL_DECISION|recommendation/i);
  });

  it('blocks catalog configuration from creating a decision', () => {
    expect(() => {
      boundary.assertCatalogConfigurationDoesNotCreateDecision();
    }).toThrow(/does not create a final government decision/i);
  });

  it('blocks evidence packet existence from creating a decision', () => {
    expect(() => {
      boundary.assertEvidencePacketDoesNotCreateDecision();
    }).toThrow(/does not create an institutional decision/i);
  });

  it('blocks case DECISION_PENDING from creating a decision', () => {
    expect(() => {
      boundary.assertCaseDecisionPendingDoesNotCreateDecision(CaseStatus.DECISION_PENDING);
    }).toThrow(/does not create a final institutional decision/i);
  });

  it('blocks government response from creating an ABSEZ decision', () => {
    expect(() => {
      boundary.assertGovernmentResponseDoesNotCreateAbsezDecision();
    }).toThrow(/ABSEZ institutional decision/i);
  });

  it('blocks professional finding from creating an institutional decision', () => {
    expect(() => {
      boundary.assertProfessionalFindingDoesNotCreateDecision();
    }).toThrow(/does not constitute an institutional decision/i);
  });

  it('rejects unconfigured outcomes at the boundary', () => {
    expect(() => {
      boundary.assertOutcomeConfigured([DecisionOutcomeCode.APPROVED], DecisionOutcomeCode.REFUSED);
    }).toThrow(/not configured for this decision type version/i);
  });

  it('rejects client-supplied lifecycle status on catalog payloads', () => {
    expect(() => {
      validation.assertClientCannotSetLifecycleStatus({ status: 'ACTIVE' });
    }).toThrow(/lifecycle status is not accepted/i);
  });
});
