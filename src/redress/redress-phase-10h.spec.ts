import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RedressRouteCategory } from '@prisma/client';

import {
  APPEAL_ROUTE_CATEGORIES,
  COMPLAINT_ROUTE_CATEGORIES,
  FORBIDDEN_AI_REDIST_ACTIONS,
  FORBIDDEN_CLIENT_REDIST_FIELDS,
  PHASE_10H_BOUNDARY_DISCLAIMER,
  PHASE_10H_INVARIANTS,
} from './redress.constants';
import { RedressBoundaryService } from './common/redress-boundary.service';

describe('Redress boundary service (Phase 10H)', () => {
  const boundary = new RedressBoundaryService();

  it('defines exactly 75 Phase 10H invariants', () => {
    expect(PHASE_10H_INVARIANTS).toHaveLength(75);
    expect(new Set(PHASE_10H_INVARIANTS.map((item) => item.id)).size).toBe(75);
  });

  it('1. complaint does not equal appeal', () => {
    expect(() =>
      boundary.assertComplaintNotAppeal(RedressRouteCategory.STATUTORY_APPEAL),
    ).toThrow('Complaint route cannot be used for appeal proceedings');
    expect(COMPLAINT_ROUTE_CATEGORIES).not.toEqual(APPEAL_ROUTE_CATEGORIES);
  });

  it('2. filing does not establish standing', () => {
    expect(() =>
      boundary.assertFilingDoesNotEstablishStanding('Filing establishes standing automatically'),
    ).toThrow('Filing does not establish standing');
  });

  it('3. AI assistance does not equal redress decision', () => {
    expect(() => boundary.assertAiCannotDecide(true)).toThrow(
      'AI assistance cannot record redress dispositions',
    );
  });

  it('5. classification does not equal disposition', () => {
    expect(() => boundary.assertClassificationNotDisposition(true, true)).toThrow(
      'Classification does not equal disposition',
    );
  });

  it('7. administrative correction does not alter substantive outcome', () => {
    expect(() =>
      boundary.assertNonSubstantiveCorrection({ altersSubstantiveOutcome: true }),
    ).toThrow('Administrative correction cannot alter substantive outcome');
  });

  it('8. clarification does not alter substantive decision', () => {
    expect(() => boundary.assertClarificationNotSubstantive(true)).toThrow(
      'Clarification cannot alter substantive decision',
    );
  });

  it('9. recommendation does not equal final redress disposition', () => {
    expect(() => boundary.assertRecommendationNotFinal(true, true)).toThrow(
      'Recommendation does not equal final redress disposition',
    );
  });

  it('12. reconsideration preserves original decision record', () => {
    expect(() => boundary.assertOriginalPreserved(false)).toThrow(
      'Original government decision must be preserved during redress',
    );
  });

  it('14. interim relief request does not auto-grant stay', () => {
    expect(() => boundary.assertNoAutoStay(false, true)).toThrow(
      'Interim stay requires explicit authorized action',
    );
  });

  it('19. original government decision preserved during redress', () => {
    expect(() => boundary.assertOriginalPreserved(true)).not.toThrow();
  });

  it('21-35. client cannot set protected redress fields', () => {
    for (const field of FORBIDDEN_CLIENT_REDIST_FIELDS) {
      expect(() => boundary.rejectClientProtectedFields({ [field]: 'override' })).toThrow(
        ForbiddenException,
      );
    }
  });

  it('37. AI actors cannot uphold, reverse, or dismiss redress matters', () => {
    for (const action of ['UPHOLD', 'REVERSE', 'DISMISS'] as const) {
      expect(FORBIDDEN_AI_REDIST_ACTIONS).toContain(action);
      expect(() => boundary.assertAiCannotAdjudicate(action)).toThrow(ForbiddenException);
    }
  });

  it('52. requested route category must match route definition category', () => {
    expect(() =>
      boundary.assertRouteCategoryMatches(
        RedressRouteCategory.SERVICE_COMPLAINT,
        RedressRouteCategory.STATUTORY_APPEAL,
      ),
    ).toThrow(BadRequestException);
  });

  it('55. non-substantive correction route forbids substantive remedy', () => {
    expect(() => boundary.assertSubstantiveRemedyPermitted(false, true)).toThrow(
      'Route does not permit substantive remedy',
    );
  });

  it('boundary disclaimer is explicit about AI and disposition', () => {
    expect(PHASE_10H_BOUNDARY_DISCLAIMER).toMatch(/AI assistance cannot adjudicate/i);
    expect(PHASE_10H_BOUNDARY_DISCLAIMER).toMatch(/Filing, classification, and investigation do not establish/i);
  });
});
