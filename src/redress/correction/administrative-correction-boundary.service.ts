import { BadRequestException, Injectable } from '@nestjs/common';
import { RedressRouteType } from '@prisma/client';

import {
  PROTECTED_SUBSTANTIVE_ATTRIBUTES,
  SUBSTANTIVE_ATTRIBUTE_ALIASES,
} from '../redress.constants';

export interface CorrectionBoundaryEvaluation {
  permitted: boolean;
  violations: string[];
  suggestedRoute?: RedressRouteType;
  routeGuidance?: string;
}

export interface EvaluateCorrectionBoundaryInput {
  requestedChanges: Record<string, unknown>;
  configuredAlternateRoutes?: RedressRouteType[];
}

@Injectable()
export class AdministrativeCorrectionBoundaryService {
  evaluateCorrectionBoundary(input: EvaluateCorrectionBoundaryInput): CorrectionBoundaryEvaluation {
    const violations = this.detectSubstantiveViolations(input.requestedChanges);

    if (violations.length === 0) {
      return { permitted: true, violations: [] };
    }

    const suggestedRoute = this.resolveAlternateRoute(input.configuredAlternateRoutes);

    return {
      permitted: false,
      violations,
      suggestedRoute,
      routeGuidance: this.buildRouteGuidance(violations, suggestedRoute),
    };
  }

  assertCorrectionPermitted(input: EvaluateCorrectionBoundaryInput): void {
    const evaluation = this.evaluateCorrectionBoundary(input);
    if (!evaluation.permitted) {
      throw new BadRequestException({
        message:
          'Requested change is substantive and cannot be made through administrative correction',
        violations: evaluation.violations,
        suggestedRoute: evaluation.suggestedRoute,
        routeGuidance: evaluation.routeGuidance,
      });
    }
  }

  private detectSubstantiveViolations(requestedChanges: Record<string, unknown>): string[] {
    const violations: string[] = [];

    for (const [key, value] of Object.entries(requestedChanges)) {
      if (value === undefined) {
        continue;
      }

      const normalizedKey = SUBSTANTIVE_ATTRIBUTE_ALIASES[key] ?? key;
      if (
        (PROTECTED_SUBSTANTIVE_ATTRIBUTES as readonly string[]).includes(normalizedKey) ||
        (PROTECTED_SUBSTANTIVE_ATTRIBUTES as readonly string[]).includes(key)
      ) {
        violations.push(normalizedKey);
      }
    }

    return [...new Set(violations)];
  }

  private resolveAlternateRoute(configuredAlternateRoutes?: RedressRouteType[]): RedressRouteType {
    if (configuredAlternateRoutes?.includes(RedressRouteType.RECONSIDERATION)) {
      return RedressRouteType.RECONSIDERATION;
    }

    if (configuredAlternateRoutes?.includes(RedressRouteType.INTERNAL_REVIEW)) {
      return RedressRouteType.INTERNAL_REVIEW;
    }

    const firstConfiguredRoute = configuredAlternateRoutes?.[0];
    if (firstConfiguredRoute) {
      return firstConfiguredRoute;
    }

    return RedressRouteType.RECONSIDERATION;
  }

  private buildRouteGuidance(violations: string[], suggestedRoute: RedressRouteType): string {
    const attributes = violations.join(', ');
    return (
      `Administrative correction cannot alter substantive attributes (${attributes}). ` +
      `Use the ${suggestedRoute} route to seek review of the underlying decision.`
    );
  }
}
