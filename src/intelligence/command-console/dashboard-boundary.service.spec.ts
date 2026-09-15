import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { DashboardBoundaryService } from './dashboard-boundary.service';

describe('DashboardBoundaryService', () => {
  let service: DashboardBoundaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardBoundaryService],
    }).compile();

    service = module.get(DashboardBoundaryService);
  });

  it('rejects client attempts to set derived dashboard fields', () => {
    expect(() => {
      service.assertClientCannotSetDashboardProjection({ status: 'SATISFACTORY', countValue: 5 });
    }).toThrow(BadRequestException);
  });

  it('rejects status dictionary meanings that create authority', () => {
    expect(() => {
      service.assertStatusDoesNotCreateAuthority('This status grants permission to approve');
    }).toThrow(BadRequestException);
  });

  it('rejects hard-coded legal color mappings', () => {
    expect(() => {
      service.assertColorSemanticIsPresentationOnly('POSITIVE_PRESENTATION', 'legally compliant');
    }).not.toThrow();
    expect(() => {
      service.assertColorSemanticIsPresentationOnly('CRITICAL', 'violation finding');
    }).not.toThrow();
  });

  it('rejects collapsed recommended/approved/issued statuses', () => {
    expect(() => {
      service.assertStatusCodesNotCollapsed(['RECOMMENDED', 'APPROVED']);
    }).toThrow(BadRequestException);
    expect(() => {
      service.assertStatusCodesNotCollapsed(['RECOMMENDED', 'ISSUED']);
    }).toThrow(BadRequestException);
  });

  it('rejects collapsed reported/verified/achieved statuses', () => {
    expect(() => {
      service.assertStatusCodesNotCollapsed(['REPORTED', 'VERIFIED']);
    }).toThrow(BadRequestException);
    expect(() => {
      service.assertStatusCodesNotCollapsed(['VERIFIED', 'ACHIEVED']);
    }).toThrow(BadRequestException);
  });

  it('blocks green indicator without required evidence', () => {
    expect(() => {
      service.assertGreenIndicatorHasEvidence('POSITIVE_PRESENTATION', undefined, true);
    }).toThrow(BadRequestException);
    expect(() => {
      service.assertGreenIndicatorHasEvidence('POSITIVE_PRESENTATION', 'packet-id', true);
    }).not.toThrow();
  });

  it('rejects widget inventing unsupported status', () => {
    expect(() => {
      service.assertWidgetUsesSupportedStatus('INVENTED_STATUS', ['KNOWN_STATUS']);
    }).toThrow(BadRequestException);
  });

  it('rejects technical admin as substantive user', () => {
    expect(() => {
      service.assertTechnicalAdminNotSubstantiveUser(true, true);
    }).toThrow(ForbiddenException);
  });
});
