import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RedressRouteCategory } from '@prisma/client';

import {
  APPEAL_ROUTE_CATEGORIES,
  COMPLAINT_ROUTE_CATEGORIES,
  FORBIDDEN_AI_REDIST_ACTIONS,
  FORBIDDEN_CLIENT_REDIST_FIELDS,
  PHASE_10H_INVARIANTS,
} from './redress.constants';
import { RedressBoundaryService } from './common/redress-boundary.service';

describe('Redress architectural must-fail invariants (Phase 10H unit)', () => {
  const boundary = new RedressBoundaryService();

  it('catalogues 75 must-fail invariants with unique ids', () => {
    expect(PHASE_10H_INVARIANTS).toHaveLength(75);
    const ids = PHASE_10H_INVARIANTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(75);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('rejects every forbidden client redress field', () => {
    for (const field of FORBIDDEN_CLIENT_REDIST_FIELDS) {
      expect(() => boundary.rejectClientProtectedFields({ [field]: true })).toThrow(
        `Client may not set "${field}"`,
      );
    }
  });

  it('rejects AI adjudication actions', () => {
    for (const action of FORBIDDEN_AI_REDIST_ACTIONS) {
      expect(() => boundary.assertAiCannotAdjudicate(action)).toThrow(ForbiddenException);
    }
  });

  it('rejects appeal categories on complaint routes', () => {
    for (const category of APPEAL_ROUTE_CATEGORIES) {
      expect(() => boundary.assertComplaintNotAppeal(category)).toThrow(BadRequestException);
    }
  });

  it('rejects complaint categories on appeal routes', () => {
    for (const category of COMPLAINT_ROUTE_CATEGORIES) {
      expect(() => boundary.assertAppealNotComplaint(category)).toThrow(BadRequestException);
    }
  });

  it('rejects substantive correction mutations', () => {
    expect(() =>
      boundary.assertNonSubstantiveCorrection({
        altersSubstantiveOutcome: true,
        altersMaterialReasons: true,
        removesReviewRights: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects recommendation marked as final disposition', () => {
    expect(() => boundary.assertRecommendationNotFinal(true, true)).toThrow(
      'Recommendation does not equal final redress disposition',
    );
  });

  it('rejects auto-granted stay without route configuration', () => {
    expect(() => boundary.assertNoAutoStay(false, true)).toThrow(
      'Interim stay requires explicit authorized action',
    );
    expect(() => boundary.assertNoAutoStay(false, false)).not.toThrow();
  });

  it('rejects substantive remedy on non-substantive routes', () => {
    expect(() => boundary.assertSubstantiveRemedyPermitted(false, true)).toThrow(
      'Route does not permit substantive remedy',
    );
  });

  it('rejects nonsubstantive correction on routes that do not permit it', () => {
    expect(() => boundary.assertNonSubstantiveRouteOnly(false, true)).toThrow(
      'Route does not permit nonsubstantive correction',
    );
  });

  it('rejects route category mismatch on filing', () => {
    expect(() =>
      boundary.assertRouteCategoryMatches(
        RedressRouteCategory.RECONSIDERATION,
        RedressRouteCategory.SERVICE_COMPLAINT,
      ),
    ).toThrow('does not match route definition');
  });
});
