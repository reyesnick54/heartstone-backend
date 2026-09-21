import { Injectable } from '@nestjs/common';
import {
  CommunicationMessageStatus,
  InvoiceStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { PUBLICLY_PRESENTABLE_AVAILABILITY } from '../../../service-catalog/common/public-discovery.constants';
import { OfficialScopeService } from '../../official/services/official-scope.service';
import { CitizenAccessService } from '../citizen-access.service';
import { EXPERIENCE_DEEP_LINK_ROUTES } from '../constants/experience-deep-link-routes.constants';
import {
  CITIZEN_SEARCH_RESOURCE_TYPES,
  EXPERIENCE_SEARCH_RESOURCE_TYPES,
  type ExperienceSearchResourceType,
  OFFICIAL_SEARCH_RESOURCE_TYPES,
  RESTRICTED_EVIDENCE_CLASSIFICATIONS,
} from '../constants/experience-search.constants';
import {
  ExperienceSearchHitDto,
  ExperienceSearchQueryDto,
  ExperienceSearchResponseDto,
} from '../dto/experience-search.dto';
import { type ResolvedExperienceActor } from '../types/experience-actor-context.types';
import { ExperienceLocalizationContract } from './experience-localization.contract';

const OUTSTANDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.PAID,
];

@Injectable()
export class UnifiedExperienceSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAccess: CitizenAccessService,
    private readonly officialScope: OfficialScopeService,
    private readonly localization: ExperienceLocalizationContract,
  ) {}

  async search(
    actor: ResolvedExperienceActor,
    query: ExperienceSearchQueryDto,
  ): Promise<ExperienceSearchResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const searchTerm = query.q.trim();

    const allowedResourceTypes = this.resolveAllowedResourceTypes(actor, query.resourceType);
    const hits: ExperienceSearchHitDto[] = [];

    for (const resourceType of allowedResourceTypes) {
      const resourceHits = await this.searchResourceType(actor, resourceType, searchTerm);
      hits.push(...resourceHits);
    }

    hits.sort((left, right) => left.title.localeCompare(right.title));
    const start = (page - 1) * pageSize;
    const pagedItems = hits.slice(start, start + pageSize);

    return {
      items: pagedItems,
      pagination: this.citizenAccess.buildPaginationMeta(page, pageSize, hits.length),
      scopeDisclaimer:
        'Search results are filtered to resources visible within the authenticated actor scope. Cross-government enumeration is not permitted.',
    };
  }

  private resolveAllowedResourceTypes(
    actor: ResolvedExperienceActor,
    requestedType?: string,
  ): ExperienceSearchResourceType[] {
    const allowed = actor.capabilities.canSearchOfficialResources
      ? OFFICIAL_SEARCH_RESOURCE_TYPES
      : actor.capabilities.canSearchCitizenResources
        ? CITIZEN_SEARCH_RESOURCE_TYPES
        : [];

    if (!requestedType) {
      return allowed;
    }

    const normalized = requestedType as ExperienceSearchResourceType;
    return allowed.includes(normalized) ? [normalized] : [];
  }

  private async searchResourceType(
    actor: ResolvedExperienceActor,
    resourceType: ExperienceSearchResourceType,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    switch (resourceType) {
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.GOVERNMENT_SERVICE:
        return this.searchGovernmentServices(searchTerm, actor.locale);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICATION:
        return actor.capabilities.canSearchOfficialResources
          ? this.searchOfficialApplications(actor, searchTerm)
          : this.searchCitizenApplications(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.DOCUMENT:
        return this.searchCitizenDocuments(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.CREDENTIAL:
        return this.searchCitizenCredentials(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.MESSAGE:
        return this.searchCitizenMessages(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.BUSINESS:
        return this.searchBusinesses(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.PAYMENT:
        return this.searchPayments(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.CASE:
        return this.searchOfficialCases(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICANT:
        return this.searchOfficialApplicants(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.ORGANIZATION:
        return this.searchOfficialOrganizations(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.EVIDENCE_REFERENCE:
        return this.searchOfficialEvidence(actor, searchTerm);
      case EXPERIENCE_SEARCH_RESOURCE_TYPES.OFFICIAL_INSTRUMENT:
        return actor.capabilities.canSearchOfficialResources
          ? this.searchOfficialInstruments(actor, searchTerm)
          : this.searchCitizenCredentials(actor, searchTerm);
      default:
        return [];
    }
  }

  private async searchGovernmentServices(
    searchTerm: string,
    locale: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const services = await this.prisma.governmentService.findMany({
      where: {
        versions: {
          some: {
            publicAvailability: { in: PUBLICLY_PRESENTABLE_AVAILABILITY },
          },
        },
        OR: [
          { publicName: { contains: searchTerm, mode: 'insensitive' } },
          { slug: { contains: searchTerm, mode: 'insensitive' } },
          { officialName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 25,
    });

    return services.map((service) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.GOVERNMENT_SERVICE,
        resourceId: service.id,
        title: service.publicName,
        subtitle: service.slug,
        labelKey: 'experience.search.government_service',
        deepLinkRoute: 'citizen.services',
        deepLinkParams: { serviceSlug: service.slug },
        locale,
      }),
    );
  }

  private async searchCitizenApplications(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const scope = await this.citizenAccess.resolveAccessibleScope(actor.identityId);
    const applications = await this.prisma.application.findMany({
      where: {
        ...this.citizenAccess.buildApplicationWhere(scope),
        OR: [
          { applicationNumber: { contains: searchTerm, mode: 'insensitive' } },
          { governmentService: { slug: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      },
      include: { governmentService: true },
      take: 25,
    });

    return applications.map((application) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICATION,
        resourceId: application.id,
        title: application.applicationNumber ?? application.id,
        subtitle: application.governmentService.slug,
        labelKey: 'experience.search.application',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_APPLICATION_DETAIL,
        deepLinkParams: { applicationId: application.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchOfficialApplications(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    if (!actor.officialContext) {
      return [];
    }

    const caseFilter = this.officialScope.buildCaseScopeFilter(actor.officialContext);
    const applications = await this.prisma.application.findMany({
      where: {
        case: caseFilter,
        OR: [
          { applicationNumber: { contains: searchTerm, mode: 'insensitive' } },
          { governmentService: { slug: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      },
      include: { governmentService: true, case: { select: { id: true } } },
      take: 25,
    });

    const hits: ExperienceSearchHitDto[] = [];
    for (const application of applications) {
      if (!application.case?.id) {
        continue;
      }

      hits.push(
        this.buildHit({
          resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICATION,
          resourceId: application.id,
          title: application.applicationNumber ?? application.id,
          subtitle: application.governmentService.slug,
          labelKey: 'experience.search.application',
          deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_CASE_DETAIL,
          deepLinkParams: { caseId: application.case.id },
          locale: actor.locale,
        }),
      );
    }

    return hits;
  }

  private async searchCitizenDocuments(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const scope = await this.citizenAccess.resolveAccessibleScope(actor.identityId);
    const applications = await this.prisma.application.findMany({
      where: this.citizenAccess.buildApplicationWhere(scope),
      select: { id: true, case: { select: { id: true } } },
    });
    const applicationIds = applications.map((application) => application.id);
    const caseIds = applications.flatMap((application) =>
      application.case?.id ? [application.case.id] : [],
    );

    if (applicationIds.length === 0 && caseIds.length === 0) {
      return [];
    }

    const documentAssociations = await this.prisma.documentAssociation.findMany({
      where: {
        OR: [
          ...(applicationIds.length > 0
            ? [{ targetType: 'APPLICATION' as const, targetId: { in: applicationIds } }]
            : []),
          ...(caseIds.length > 0
            ? [{ targetType: 'CASE' as const, targetId: { in: caseIds } }]
            : []),
        ],
        documentRecord: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { documentNumber: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
      include: { documentRecord: true },
      take: 25,
    });

    const seen = new Set<string>();
    const hits: ExperienceSearchHitDto[] = [];

    for (const association of documentAssociations) {
      if (seen.has(association.documentRecord.id)) {
        continue;
      }
      seen.add(association.documentRecord.id);

      hits.push(
        this.buildHit({
          resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.DOCUMENT,
          resourceId: association.documentRecord.id,
          title: association.documentRecord.title,
          subtitle: association.documentRecord.documentNumber,
          labelKey: 'experience.search.document',
          deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_DOCUMENT_DETAIL,
          deepLinkParams: { documentId: association.documentRecord.id },
          locale: actor.locale,
        }),
      );
    }

    return hits;
  }

  private async searchCitizenCredentials(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const scope = await this.citizenAccess.resolveAccessibleScope(actor.identityId);
    const caseWhere = this.citizenAccess.buildCaseWhere(scope);

    const instruments = await this.prisma.officialInstrument.findMany({
      where: {
        AND: [
          {
            OR: [{ holderIdentityId: actor.identityId }, { case: caseWhere }],
          },
          {
            status: {
              in: [
                OfficialInstrumentStatus.ISSUED,
                OfficialInstrumentStatus.EFFECTIVE,
                OfficialInstrumentStatus.RENEWED,
              ],
            },
          },
          {
            instrumentNumber: { contains: searchTerm, mode: 'insensitive' },
          },
        ],
      },
      take: 25,
    });

    return instruments.map((instrument) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.CREDENTIAL,
        resourceId: instrument.id,
        title: instrument.instrumentNumber ?? instrument.instrumentType ?? instrument.id,
        subtitle: instrument.instrumentNumber ?? undefined,
        labelKey: 'experience.search.credential',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_INSTRUMENT_DETAIL,
        deepLinkParams: { instrumentId: instrument.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchCitizenMessages(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const scope = await this.citizenAccess.resolveAccessibleScope(actor.identityId);
    const citizenScope = await this.prisma.application.findMany({
      where: this.citizenAccess.buildApplicationWhere(scope),
      select: { case: { select: { id: true } } },
    });
    const caseIds = [
      ...new Set(
        citizenScope.flatMap((application) => (application.case?.id ? [application.case.id] : [])),
      ),
    ];

    if (caseIds.length === 0) {
      return [];
    }

    const messages = await this.prisma.communicationMessage.findMany({
      where: {
        caseId: { in: caseIds },
        status: {
          in: [
            CommunicationMessageStatus.DELIVERED,
            CommunicationMessageStatus.PARTIALLY_DELIVERED,
          ],
        },
        OR: [
          { subject: { contains: searchTerm, mode: 'insensitive' } },
          { messageReference: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 25,
    });

    return messages.map((message) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.MESSAGE,
        resourceId: message.id,
        title: message.subject,
        subtitle: message.messageReference,
        labelKey: 'experience.search.message',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_MESSAGE_DETAIL,
        deepLinkParams: { messageId: message.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchBusinesses(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const organizationIds = actor.actor.organizationMemberships.map(
      (membership) => membership.organizationId,
    );

    if (organizationIds.length === 0) {
      return [];
    }

    const organizations = await this.prisma.organization.findMany({
      where: {
        id: { in: organizationIds },
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { code: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 25,
    });

    return organizations.map((organization) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.BUSINESS,
        resourceId: organization.id,
        title: organization.name,
        subtitle: organization.code,
        labelKey: 'experience.search.business',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.BUSINESS_OVERVIEW,
        deepLinkParams: { organizationId: organization.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchPayments(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    const scope = await this.citizenAccess.resolveAccessibleScope(actor.identityId);
    const caseWhere = this.citizenAccess.buildCaseWhere(scope);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: OUTSTANDING_INVOICE_STATUSES },
        case: caseWhere,
        OR: [{ invoiceNumber: { contains: searchTerm, mode: 'insensitive' } }],
      },
      take: 25,
    });

    return invoices.map((invoice) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.PAYMENT,
        resourceId: invoice.id,
        title: invoice.invoiceNumber,
        labelKey: 'experience.search.payment',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_PAYMENT_INVOICE,
        deepLinkParams: { invoiceId: invoice.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchOfficialCases(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    if (!actor.officialContext) {
      return [];
    }

    const cases = await this.prisma.case.findMany({
      where: {
        ...this.officialScope.buildCaseScopeFilter(actor.officialContext),
        caseNumber: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 25,
    });

    return cases.map((caseRecord) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.CASE,
        resourceId: caseRecord.id,
        title: caseRecord.caseNumber,
        subtitle: caseRecord.legalStatusLabel ?? undefined,
        labelKey: 'experience.search.case',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_CASE_DETAIL,
        deepLinkParams: { caseId: caseRecord.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchOfficialApplicants(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    if (!actor.officialContext) {
      return [];
    }

    const scopedCases = await this.prisma.case.findMany({
      where: this.officialScope.buildCaseScopeFilter(actor.officialContext),
      select: { applicantIdentityId: true },
      take: 100,
    });

    const applicantIds = [
      ...new Set(scopedCases.map((caseRecord) => caseRecord.applicantIdentityId)),
    ];
    if (applicantIds.length === 0) {
      return [];
    }

    const identities = await this.prisma.identity.findMany({
      where: {
        id: { in: applicantIds },
        displayName: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 25,
    });

    return identities.map((identity) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.APPLICANT,
        resourceId: identity.id,
        title: identity.displayName,
        labelKey: 'experience.search.applicant',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_CASE_DETAIL,
        deepLinkParams: { caseId: scopedCases[0]?.applicantIdentityId ?? identity.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchOfficialOrganizations(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    if (!actor.officialContext) {
      return [];
    }

    const scopedApplications = await this.prisma.application.findMany({
      where: {
        case: this.officialScope.buildCaseScopeFilter(actor.officialContext),
        organizationId: { not: null },
      },
      select: { organizationId: true },
      take: 100,
    });

    const organizationIds = [
      ...new Set(
        scopedApplications
          .map((application) => application.organizationId)
          .filter((organizationId): organizationId is string => organizationId !== null),
      ),
    ];

    if (organizationIds.length === 0) {
      return [];
    }

    const organizations = await this.prisma.organization.findMany({
      where: {
        id: { in: organizationIds },
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { code: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 25,
    });

    return organizations.map((organization) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.ORGANIZATION,
        resourceId: organization.id,
        title: organization.name,
        subtitle: organization.code,
        labelKey: 'experience.search.organization',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_CASE_DETAIL,
        deepLinkParams: { caseId: organization.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchOfficialEvidence(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    if (!actor.officialContext || !actor.capabilities.substantiveAccess) {
      return [];
    }

    const evidenceRecords = await this.prisma.evidenceRecord.findMany({
      where: {
        case: this.officialScope.buildCaseScopeFilter(actor.officialContext),
        OR: [
          { evidenceNumber: { contains: searchTerm, mode: 'insensitive' } },
          { title: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 50,
    });

    const visibleEvidence = evidenceRecords.filter(
      (record) => !this.isRestrictedEvidence(record.confidentialityClassification),
    );

    return visibleEvidence.map((record) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.EVIDENCE_REFERENCE,
        resourceId: record.id,
        title: record.title,
        subtitle: record.evidenceNumber,
        labelKey: 'experience.search.evidence_reference',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_EVIDENCE_DETAIL,
        deepLinkParams: { evidenceId: record.id },
        locale: actor.locale,
      }),
    );
  }

  private async searchOfficialInstruments(
    actor: ResolvedExperienceActor,
    searchTerm: string,
  ): Promise<ExperienceSearchHitDto[]> {
    if (!actor.officialContext) {
      return [];
    }

    const instruments = await this.prisma.officialInstrument.findMany({
      where: {
        case: this.officialScope.buildCaseScopeFilter(actor.officialContext),
        instrumentNumber: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 25,
    });

    return instruments.map((instrument) =>
      this.buildHit({
        resourceType: EXPERIENCE_SEARCH_RESOURCE_TYPES.OFFICIAL_INSTRUMENT,
        resourceId: instrument.id,
        title: instrument.instrumentNumber ?? instrument.instrumentType ?? instrument.id,
        subtitle: instrument.instrumentNumber ?? undefined,
        labelKey: 'experience.search.official_instrument',
        deepLinkRoute: EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_INSTRUMENT_DETAIL,
        deepLinkParams: { instrumentId: instrument.id },
        locale: actor.locale,
      }),
    );
  }

  isRestrictedEvidence(classification: string): boolean {
    return RESTRICTED_EVIDENCE_CLASSIFICATIONS.some(
      (restricted) => classification.toUpperCase() === restricted,
    );
  }

  private buildHit(input: {
    resourceType: ExperienceSearchResourceType;
    resourceId: string;
    title: string;
    subtitle?: string;
    labelKey: string;
    deepLinkRoute: string;
    deepLinkParams: Record<string, string>;
    locale: string;
  }): ExperienceSearchHitDto {
    return {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      title: input.title,
      subtitle: input.subtitle,
      displayLabel: this.localization.buildLabel(
        {
          defaultLabel: input.title,
          labelKey: input.labelKey,
        },
        input.locale,
      ),
      deepLink: {
        route: input.deepLinkRoute,
        params: input.deepLinkParams,
      },
      matchedAt: new Date().toISOString(),
    };
  }
}
