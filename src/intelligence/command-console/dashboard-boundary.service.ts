import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import {
  FORBIDDEN_CLIENT_DASHBOARD_FIELDS,
  FORBIDDEN_COLOR_LEGAL_MAPPINGS,
  FORBIDDEN_STATUS_COLLAPSE_GROUPS,
} from '../intelligence.constants';

@Injectable()
export class DashboardBoundaryService {
  assertClientCannotSetDashboardProjection(payload: Record<string, unknown>) {
    for (const field of FORBIDDEN_CLIENT_DASHBOARD_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(
          `Clients cannot set dashboard projection field "${field}"; indicators are derived from authoritative records`,
        );
      }
    }
  }

  assertStatusDoesNotCreateAuthority(statusMeaning: string) {
    const normalized = statusMeaning.toLowerCase();
    const authorityPhrases = [
      'creates authority',
      'grants permission',
      'authorizes action',
      'permits decision',
      'confers authority',
    ];
    for (const phrase of authorityPhrases) {
      if (normalized.includes(phrase)) {
        throw new BadRequestException(
          'Dashboard status dictionary entries cannot create or imply institutional authority',
        );
      }
    }
  }

  assertColorSemanticIsPresentationOnly(colorSemantic: string, meaning: string) {
    const combined = `${colorSemantic} ${meaning}`.toUpperCase();
    for (const forbidden of FORBIDDEN_COLOR_LEGAL_MAPPINGS) {
      const [color, legalClaim] = forbidden.split(' = ');
      if (!color || !legalClaim) continue;
      if (combined.includes(color) && combined.includes(legalClaim.toUpperCase())) {
        throw new BadRequestException(
          `Color semantics are presentation-only and cannot encode legal meaning: "${forbidden}"`,
        );
      }
    }
  }

  assertStatusCodesNotCollapsed(statusCodes: string[]) {
    const normalized = statusCodes.map((code) => code.toUpperCase());
    for (const group of FORBIDDEN_STATUS_COLLAPSE_GROUPS) {
      const present = group.filter((code) => normalized.includes(code));
      if (present.length > 1) {
        throw new BadRequestException(
          `Dashboard cannot collapse distinct status codes: ${present.join(', ')}`,
        );
      }
    }
  }

  assertWidgetUsesSupportedStatus(
    widgetStatusCode: string,
    supportedStatusCodes: readonly string[],
  ) {
    if (!supportedStatusCodes.includes(widgetStatusCode)) {
      throw new BadRequestException(
        `Widget cannot invent unsupported status "${widgetStatusCode}"; must reference status dictionary`,
      );
    }
  }

  assertGreenIndicatorHasEvidence(
    colorSemantic: string,
    evidencePacketId: string | null | undefined,
    requiresEvidencePacket: boolean,
  ) {
    if (requiresEvidencePacket && colorSemantic === 'POSITIVE_PRESENTATION' && !evidencePacketId) {
      throw new BadRequestException(
        'Green/positive presentation indicator blocked: required evidence packet is missing',
      );
    }
  }

  assertTechnicalAdminNotSubstantiveUser(technicalPermissionOnly: boolean, accessGranted: boolean) {
    if (technicalPermissionOnly && accessGranted) {
      throw new ForbiddenException(
        'Technical administrators cannot access substantive restricted dashboard records without authorized purpose and substantive access policy',
      );
    }
  }
}
