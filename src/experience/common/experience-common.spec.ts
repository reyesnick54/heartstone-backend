import { ApplicantCategory, AssuranceLevel, IdentityType } from '@prisma/client';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { TECHNICAL_ADMIN_ROLE_MARKER } from '../official/official-experience.constants';
import { EXPERIENCE_DEEP_LINK_ROUTES } from './constants/experience-deep-link-routes.constants';
import {
  EXECUTIVE_ROLE_MARKER,
  EXPERIENCE_PERSONAS,
} from './constants/experience-persona.constants';
import { EXPERIENCE_SEARCH_RESOURCE_TYPES } from './constants/experience-search.constants';
import { ExperienceActionCenterService } from './services/experience-action-center.service';
import { ExperienceActorResolverService } from './services/experience-actor-resolver.service';
import { ExperienceDeepLinkService } from './services/experience-deep-link.service';
import { ExperienceInboxService } from './services/experience-inbox.service';
import { ExperienceLocalizationContract } from './services/experience-localization.contract';
import { ExperienceNavigationService } from './services/experience-navigation.service';
import { UnifiedExperienceSearchService } from './services/unified-experience-search.service';
import { type ResolvedExperienceActor } from './types/experience-actor-context.types';

function buildActor(overrides?: Partial<ActorContext>): ActorContext {
  return {
    identityId: 'identity-1',
    userAccountId: 'user-1',
    personId: 'person-1',
    sessionId: 'session-1',
    identityType: IdentityType.INDIVIDUAL,
    assuranceLevel: AssuranceLevel.HIGH,
    session: {
      sessionId: 'session-1',
      status: 'ACTIVE',
      assuranceLevel: AssuranceLevel.HIGH,
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      lastUsedAt: null,
      ipAddress: null,
      userAgent: null,
    },
    organizationMemberships: [],
    representativeAuthorities: [],
    officeholderLinks: [],
    activeAppointments: [],
    activeDelegations: [],
    institutionContexts: [],
    hasInstitutionalRelationships: false,
    ...overrides,
  };
}

function buildResolvedActor(overrides?: Partial<ResolvedExperienceActor>): ResolvedExperienceActor {
  const actor = buildActor(overrides?.actor);
  return {
    identityId: actor.identityId,
    primaryPersona: EXPERIENCE_PERSONAS.CITIZEN,
    personas: [EXPERIENCE_PERSONAS.CITIZEN],
    actor,
    officialContext: null,
    capabilities: {
      canSearchCitizenResources: true,
      canSearchOfficialResources: false,
      substantiveAccess: false,
      executiveBriefing: false,
      departmentManagement: false,
      technicalAdministration: false,
      hasRepresentativeAuthority: false,
      hasOrganizationMembership: false,
    },
    locale: 'en',
    ...overrides,
  };
}

describe('Experience layer shared services', () => {
  describe('UnifiedExperienceSearchService', () => {
    const prisma = {
      application: { findMany: jest.fn() },
      identity: { findMany: jest.fn() },
      evidenceRecord: { findMany: jest.fn() },
      case: { findFirst: jest.fn(), findMany: jest.fn() },
      governmentService: { findMany: jest.fn() },
      documentAssociation: { findMany: jest.fn() },
      officialInstrument: { findMany: jest.fn() },
      communicationMessage: { findMany: jest.fn() },
      organization: { findMany: jest.fn() },
      invoice: { findMany: jest.fn() },
    };

    const citizenAccess = {
      resolveAccessibleScope: jest.fn(),
      buildApplicationWhere: jest.fn(),
      buildCaseWhere: jest.fn(),
      buildPaginationMeta: jest.fn().mockReturnValue({
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    };

    const officialScope = {
      buildCaseScopeFilter: jest.fn(),
    };

    const localization = new ExperienceLocalizationContract();
    const service = new UnifiedExperienceSearchService(
      prisma as never,
      citizenAccess as never,
      officialScope as never,
      localization,
    );

    beforeEach(() => {
      jest.clearAllMocks();
      citizenAccess.resolveAccessibleScope.mockResolvedValue({
        identityId: 'identity-1',
        activeRepresentativeAuthorityIds: [],
        representedOrganizationIds: [],
      });
      citizenAccess.buildApplicationWhere.mockReturnValue({
        applicantIdentityId: 'identity-1',
      });
      citizenAccess.buildCaseWhere.mockReturnValue({
        applicantIdentityId: 'identity-1',
      });
    });

    it('search respects actor scope for citizen applications', async () => {
      prisma.application.findMany.mockResolvedValue([
        {
          id: 'app-1',
          applicationNumber: 'APP-001',
          governmentService: { slug: 'business-permit' },
        },
      ]);

      const actor = buildResolvedActor();
      const result = await service.search(actor, {
        q: 'APP',
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICATION,
        page: 1,
        pageSize: 20,
      });

      expect(prisma.application.findMany).toHaveBeenCalled();
      const [[searchArgs]] = jest.mocked(prisma.application.findMany).mock.calls;
      expect(searchArgs).toMatchObject({
        where: { applicantIdentityId: 'identity-1' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.resourceType).toBe(EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICATION);
    });

    it('search cannot enumerate another citizen', async () => {
      prisma.application.findMany.mockResolvedValue([]);
      prisma.identity.findMany.mockResolvedValue([]);

      const actor = buildResolvedActor();
      const result = await service.search(actor, {
        q: 'other-citizen',
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICANT,
        page: 1,
        pageSize: 20,
      });

      expect(result.items).toHaveLength(0);
      expect(prisma.identity.findMany).not.toHaveBeenCalled();
    });

    it('restricted evidence search result is filtered', () => {
      expect(service.isRestrictedEvidence('RESTRICTED')).toBe(true);
      expect(service.isRestrictedEvidence('PUBLIC')).toBe(false);
    });

    it('filters restricted evidence from official search results', async () => {
      officialScope.buildCaseScopeFilter.mockReturnValue({ id: 'case-1' });
      prisma.evidenceRecord.findMany.mockResolvedValue([
        {
          id: 'evidence-1',
          title: 'Public exhibit',
          evidenceNumber: 'EV-001',
          confidentialityClassification: 'PUBLIC',
        },
        {
          id: 'evidence-2',
          title: 'Restricted memo',
          evidenceNumber: 'EV-002',
          confidentialityClassification: 'RESTRICTED',
        },
      ]);

      const actor = buildResolvedActor({
        primaryPersona: EXPERIENCE_PERSONAS.GOVERNMENT_OFFICIAL,
        capabilities: {
          canSearchCitizenResources: false,
          canSearchOfficialResources: true,
          substantiveAccess: true,
          executiveBriefing: false,
          departmentManagement: false,
          technicalAdministration: false,
          hasRepresentativeAuthority: false,
          hasOrganizationMembership: false,
        },
        officialContext: {
          identityId: 'official-1',
          scope: { departmentIds: ['dept-1'] },
        } as never,
      });

      const result = await service.search(actor, {
        q: 'EV',
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.EVIDENCE_REFERENCE,
        page: 1,
        pageSize: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.resourceId).toBe('evidence-1');
    });
  });

  describe('ExperienceNavigationService', () => {
    const localization = new ExperienceLocalizationContract();
    const service = new ExperienceNavigationService(localization);

    it('citizen does not receive official navigation', () => {
      const actor = buildResolvedActor({
        primaryPersona: EXPERIENCE_PERSONAS.CITIZEN,
      });

      const navigation = service.buildNavigation(actor);

      expect(navigation.items.some((item) => item.route.startsWith('official.'))).toBe(false);
      expect(service.includesOfficialNavigation(actor)).toBe(false);
    });

    it('ordinary official does not receive executive navigation', () => {
      const actor = buildResolvedActor({
        primaryPersona: EXPERIENCE_PERSONAS.GOVERNMENT_OFFICIAL,
        personas: [EXPERIENCE_PERSONAS.GOVERNMENT_OFFICIAL],
        capabilities: {
          canSearchCitizenResources: false,
          canSearchOfficialResources: true,
          substantiveAccess: true,
          executiveBriefing: false,
          departmentManagement: false,
          technicalAdministration: false,
          hasRepresentativeAuthority: false,
          hasOrganizationMembership: false,
        },
      });

      const navigation = service.buildNavigation(actor);

      expect(navigation.items.some((item) => item.route.startsWith('executive.'))).toBe(false);
      expect(service.includesExecutiveNavigation(actor)).toBe(false);
    });

    it('platform administrator navigation does not create case authority', () => {
      const actor = buildResolvedActor({
        primaryPersona: EXPERIENCE_PERSONAS.PLATFORM_ADMINISTRATION,
        personas: [EXPERIENCE_PERSONAS.PLATFORM_ADMINISTRATION],
        capabilities: {
          canSearchCitizenResources: false,
          canSearchOfficialResources: false,
          substantiveAccess: false,
          executiveBriefing: false,
          departmentManagement: false,
          technicalAdministration: true,
          hasRepresentativeAuthority: false,
          hasOrganizationMembership: false,
        },
      });

      const navigation = service.buildNavigation(actor);

      expect(navigation.items.every((item) => !item.route.startsWith('official.cases'))).toBe(true);
      expect(
        navigation.items.every((item) => item.accessible || item.route.startsWith('platform.')),
      ).toBe(true);
      expect(actor.capabilities.substantiveAccess).toBe(false);
    });
  });

  describe('ExperienceInboxService', () => {
    const prisma = {
      application: { findMany: jest.fn() },
      communicationMessage: { findMany: jest.fn() },
      applicantInformationRequest: { findMany: jest.fn() },
      invoice: { findMany: jest.fn() },
      officialInstrument: { findMany: jest.fn() },
      complianceMatter: { findMany: jest.fn() },
      redressMatter: { findMany: jest.fn() },
      caseCommunication: { findMany: jest.fn() },
    };

    const citizenAccess = {
      resolveAccessibleScope: jest.fn(),
      buildApplicationWhere: jest.fn(),
      buildCaseWhere: jest.fn(),
      buildPaginationMeta: jest
        .fn()
        .mockImplementation((page: number, pageSize: number, total: number) => ({
          page,
          pageSize,
          totalItems: total,
          totalPages: total === 0 ? 0 : 1,
          hasNextPage: false,
          hasPreviousPage: false,
        })),
    };

    const localization = new ExperienceLocalizationContract();
    const service = new ExperienceInboxService(
      prisma as never,
      citizenAccess as never,
      localization,
    );

    beforeEach(() => {
      jest.clearAllMocks();
      citizenAccess.resolveAccessibleScope.mockResolvedValue({
        identityId: 'identity-1',
        activeRepresentativeAuthorityIds: [],
        representedOrganizationIds: [],
      });
      citizenAccess.buildApplicationWhere.mockReturnValue({ applicantIdentityId: 'identity-1' });
      citizenAccess.buildCaseWhere.mockReturnValue({ applicantIdentityId: 'identity-1' });
      prisma.application.findMany.mockResolvedValue([{ id: 'app-1', case: { id: 'case-1' } }]);
      prisma.communicationMessage.findMany.mockResolvedValue([
        {
          id: 'message-1',
          caseId: 'case-1',
          subject: 'Decision notice',
          messageReference: 'MSG-001',
          decisionNoticeReference: 'DN-001',
          approvedAt: new Date('2026-01-02T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          deliveries: [],
        },
      ]);
      prisma.applicantInformationRequest.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.officialInstrument.findMany.mockResolvedValue([]);
      prisma.complianceMatter.findMany.mockResolvedValue([]);
      prisma.redressMatter.findMany.mockResolvedValue([]);
      prisma.caseCommunication.findMany.mockResolvedValue([
        {
          id: 'case-comm-1',
          caseId: 'case-1',
          subject: 'Decision notice',
          sentAt: new Date('2026-01-01T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    });

    it('inbox does not duplicate messages', async () => {
      const actor = buildResolvedActor();
      const result = await service.listInbox(actor, { page: 1, pageSize: 20 });

      const communicationItems = result.items.filter((item) =>
        item.inboxItemId.startsWith('communication-message:'),
      );
      const caseCommunicationItems = result.items.filter((item) =>
        item.inboxItemId.startsWith('case-communication:'),
      );

      expect(communicationItems).toHaveLength(1);
      expect(caseCommunicationItems).toHaveLength(0);
    });
  });

  describe('ExperienceActionCenterService', () => {
    const citizenActionCenter = {
      listActions: jest.fn(),
    };
    const officialAvailableActions = {
      getAvailableActions: jest.fn(),
    };
    const localization = new ExperienceLocalizationContract();
    const service = new ExperienceActionCenterService(
      citizenActionCenter as never,
      officialAvailableActions as never,
      localization,
    );

    it('action center produces stable action codes', async () => {
      citizenActionCenter.listActions.mockResolvedValue({
        items: [
          {
            actionCode: 'PAY_INVOICE',
            label: { label: 'Pay invoice', labelKey: 'citizen.action.pay_invoice' },
            priority: 5,
            dueAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            attribution: {
              institutionId: 'inst-1',
              institutionCode: 'INST',
              institutionName: 'Institution',
            },
            deepLink: { route: 'citizen.payment.invoice', params: { invoiceId: 'inv-1' } },
            relatedInvoiceId: 'inv-1',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const actor = buildResolvedActor();
      const result = await service.listActions(actor, { page: 1, pageSize: 20 });

      expect(result.items[0]?.actionCode).toBe('PAY_INVOICE');
      expect(result.executionRequiresRevalidation).toBe(true);
      expect(result.items[0]?.presentationOnly).toBe(true);
    });
  });

  describe('ExperienceDeepLinkService', () => {
    const citizenAccess = {
      assertApplicationAccess: jest.fn(),
      assertCaseAccess: jest.fn(),
    };
    const officialScope = {
      assertCaseAccess: jest.fn(),
    };
    const service = new ExperienceDeepLinkService(citizenAccess as never, officialScope as never);

    it('deep links cannot bypass backend authorization', async () => {
      citizenAccess.assertApplicationAccess.mockRejectedValue(new Error('denied'));

      const actor = buildResolvedActor();
      const result = await service.resolveDeepLink(actor, {
        route: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_APPLICATION_DETAIL,
        params: { applicationId: 'foreign-app' },
      });

      expect(result.authorized).toBe(false);
      expect(result.denialReason).toContain('scope');
    });
  });

  describe('ExperienceLocalizationContract', () => {
    const contract = new ExperienceLocalizationContract();

    it('language/localization metadata remains separate from authoritative record content', () => {
      const authoritative = { title: 'Official Record Title', recordNumber: 'REC-001' };
      const presentation = contract.buildLabel({
        defaultLabel: 'Record',
        labelKey: 'experience.record.label',
        labels: { en: 'Record', es: 'Registro' },
      });

      const separated = contract.separatePresentationFromAuthoritative(authoritative, presentation);

      expect(separated.authoritativeContent.title).toBe('Official Record Title');
      expect(separated.presentationLabel.labelKey).toBe('experience.record.label');
      expect(separated.authoritativeContent).not.toHaveProperty('labelKey');
    });
  });

  describe('ExperienceActorResolverService', () => {
    const prisma = {
      application: { findMany: jest.fn() },
    };
    const officialContext = {
      resolveContext: jest.fn(),
    };
    const service = new ExperienceActorResolverService(prisma as never, officialContext as never);

    it('resolves executive persona only with executive role marker', async () => {
      prisma.application.findMany.mockResolvedValue([]);
      officialContext.resolveContext.mockResolvedValue({
        technicalCapabilities: {
          substantiveAccessAllowed: true,
          hasActiveAppointment: true,
        },
      });

      const actor = buildActor({
        officeholderLinks: [
          { linkId: 'link-1', officeholderId: 'oh-1', status: 'ACTIVE', linkedAt: new Date() },
        ],
        activeAppointments: [
          {
            appointmentId: 'appt-1',
            officeholderId: 'oh-1',
            officeId: 'office-1',
            departmentId: 'dept-1',
            institutionId: 'inst-1',
            status: 'ACTIVE',
            effectiveFrom: new Date('2020-01-01'),
            effectiveUntil: null,
          },
        ],
        hasInstitutionalRelationships: true,
      });

      const resolved = await service.resolve(actor, { technicalRoleMarker: EXECUTIVE_ROLE_MARKER });

      expect(resolved.primaryPersona).toBe(EXPERIENCE_PERSONAS.EXECUTIVE_LEADERSHIP);
    });

    it('resolves platform administration persona for technical admin', async () => {
      prisma.application.findMany.mockResolvedValue([
        { applicantCategory: ApplicantCategory.CITIZEN },
      ]);

      const actor = buildActor();
      const resolved = await service.resolve(actor, {
        technicalRoleMarker: TECHNICAL_ADMIN_ROLE_MARKER,
      });

      expect(resolved.personas).toContain(EXPERIENCE_PERSONAS.PLATFORM_ADMINISTRATION);
      expect(resolved.capabilities.technicalAdministration).toBe(true);
      expect(resolved.capabilities.substantiveAccess).toBe(false);
    });
  });
});
