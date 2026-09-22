import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PublicSafetyOfficialNoticeStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { PublicSafetyBoundaryService } from './common/public-safety-boundary.service';
import { PublicSafetyNoticeService } from './notices/public-safety-notice.service';
import { PLATFORM_ADMIN_PUBLIC_SAFETY_ROLE_MARKER } from './public-safety.constants';

describe('Public safety must-fail gates', () => {
  describe('PublicSafetyBoundaryService', () => {
    let boundary: PublicSafetyBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PublicSafetyBoundaryService],
      }).compile();
      boundary = module.get(PublicSafetyBoundaryService);
    });

    it('labels unverified reports as unverified', () => {
      const projection = boundary.sanitizeIncidentReportForProjection({
        verificationStatus: 'UNVERIFIED',
        summaryLabel: 'Smoke reported',
        protectsReporterIdentity: true,
        reporterIdentityId: 'reporter-1',
        viewerIdentityId: 'reporter-1',
      });
      expect(projection.verificationLabel).toBe('unverified');
      expect(projection.isVerified).toBe(false);
    });

    it('preserves reporter privacy for non-owner viewers', () => {
      const projection = boundary.sanitizeIncidentReportForProjection({
        verificationStatus: 'UNVERIFIED',
        summaryLabel: 'Smoke reported',
        protectsReporterIdentity: true,
        reporterIdentityId: 'reporter-1',
        viewerIdentityId: 'other-user',
      });
      expect(projection.reporterIdentityRedacted).toBe(true);
    });

    it('citizen cannot issue public emergency alert', () => {
      expect(() => {
        boundary.assertCitizenCannotIssuePublicEmergencyAlert('ISSUE_PUBLIC_EMERGENCY_ALERT');
      }).toThrow(ForbiddenException);
    });

    it('AI cannot issue public emergency declaration', () => {
      expect(() => {
        boundary.assertAiCannotIssuePublicEmergencyDeclaration('DECLARE_EMERGENCY');
      }).toThrow(ForbiddenException);
    });

    it('platform admin cannot create emergency authority', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotCreateEmergencyAuthority(
          PLATFORM_ADMIN_PUBLIC_SAFETY_ROLE_MARKER,
          'CREATE_EMERGENCY_AUTHORITY',
        );
      }).toThrow(ForbiddenException);
    });

    it('executive dashboard cannot mutate incident state', () => {
      expect(() => {
        boundary.assertExecutiveDashboardIsReadOnly(true);
      }).toThrow(ForbiddenException);
    });

    it('recovery assistance remains separate from incident report', () => {
      expect(() => {
        boundary.assertRecoveryAssistanceSeparateFromIncidentReport({
          recoveryApplicationReference: 'PSRCV-1',
          incidentReportReference: 'PSINC-1',
          mergedIntoIncidentReport: false,
        });
      }).toThrow(BadRequestException);
    });

    it('public notice contains only approved content when published', () => {
      expect(() => {
        boundary.resolvePublicNoticeContent({
          status: PublicSafetyOfficialNoticeStatus.DRAFT,
          draftContent: 'draft leak',
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe('PublicSafetyNoticeService', () => {
    const prisma = {
      publicSafetyOfficialNotice: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    let service: PublicSafetyNoticeService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PublicSafetyNoticeService,
          PublicSafetyBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(PublicSafetyNoticeService);
      jest.clearAllMocks();
    });

    it('unauthorized official cannot publish notice', async () => {
      await expect(
        service.publishNotice({
          noticeId: 'notice-1',
          actor: { isAuthorizedNoticeOfficial: false },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
