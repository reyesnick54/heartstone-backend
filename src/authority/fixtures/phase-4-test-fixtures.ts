/**
 * NON_PRODUCTION SAMPLE TEST_ONLY
 * Representative fixtures for Phase 4 eight-classification acceptance tests.
 * These fixtures are not legal assertions and must not be used in production.
 */
import {
  AuthorityActionType,
  AuthorityClassification,
  AuthorityConditionType,
  AuthorityDependencyType,
  ControlledFunctionClass,
  ExternalAuthorityType,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { NON_PRODUCTION_FIXTURE_MARKER } from '../authority.constants';
import { type FunctionActivationService } from '../function-authority-records/function-activation.service';
import { type FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';
import { type GoverningSourcesService } from '../governing-sources/governing-sources.service';

export interface Phase4FixtureContext {
  institutionId: string;
  officeId: string;
  officeholderId: string;
  appointmentId: string;
  identityId: string;
  actorIdentityId: string;
  delegationId?: string;
  externalAuthorityId?: string;
}

export interface Phase4ClassificationFixture {
  marker: string;
  classification: AuthorityClassification;
  functionId: string;
  functionCode: string;
  permittedActions: AuthorityActionType[];
  deniedActions: AuthorityActionType[];
}

export class Phase4TestFixtures {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governingSources: GoverningSourcesService,
    private readonly functions: FunctionAuthorityRecordsService,
    private readonly activation: FunctionActivationService,
  ) {}

  async seedStructuralContext(): Promise<Phase4FixtureContext> {
    const jurisdiction = await this.prisma.jurisdiction.create({
      data: {
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-JUR`,
        name: 'NON_PRODUCTION Sample Jurisdiction',
        type: 'SPECIAL_ECONOMIC_ZONE',
      },
    });

    const institution = await this.prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-ABSEZ`,
        name: 'NON_PRODUCTION Sample ABSEZ Authority',
        type: 'SPECIAL_ECONOMIC_ZONE_AUTHORITY',
      },
    });

    const department = await this.prisma.department.create({
      data: {
        institutionId: institution.id,
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-DEPT`,
        name: 'NON_PRODUCTION Sample Department',
      },
    });

    const office = await this.prisma.office.create({
      data: {
        departmentId: department.id,
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-OFFICE`,
        name: 'NON_PRODUCTION Sample Office',
      },
    });

    const officeholder = await this.prisma.officeholder.create({
      data: {
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-OH`,
        name: 'NON_PRODUCTION Sample Officeholder',
      },
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const person = await this.prisma.person.create({
      data: { givenName: 'Sample', familyName: 'Actor' },
    });

    const account = await this.prisma.userAccount.create({
      data: {
        personId: person.id,
        loginIdentifier: `${NON_PRODUCTION_FIXTURE_MARKER}@test.local`,
        status: 'ACTIVE',
      },
    });

    const identity = await this.prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        userAccountId: account.id,
        personId: person.id,
        displayName: 'NON_PRODUCTION Sample Identity',
      },
    });

    await this.prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: 'ACTIVE',
      },
    });

    const actorPerson = await this.prisma.person.create({
      data: { givenName: 'Activation', familyName: 'Actor' },
    });

    const actorIdentity = await this.prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        personId: actorPerson.id,
        displayName: 'NON_PRODUCTION Activation Actor',
      },
    });

    const externalAuthority = await this.prisma.externalAuthority.create({
      data: {
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-EXT`,
        name: 'NON_PRODUCTION Sample External Authority',
        type: ExternalAuthorityType.PROFESSIONAL,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const delegation = await this.prisma.delegation.create({
      data: {
        institutionId: institution.id,
        delegatorOfficeId: office.id,
        recipientOfficeholderId: officeholder.id,
        scopeDescription: 'NON_PRODUCTION sample delegated scope',
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    return {
      institutionId: institution.id,
      officeId: office.id,
      officeholderId: officeholder.id,
      appointmentId: appointment.id,
      identityId: identity.id,
      actorIdentityId: actorIdentity.id,
      delegationId: delegation.id,
      externalAuthorityId: externalAuthority.id,
    };
  }

  async seedEightClassifications(
    ctx: Phase4FixtureContext,
  ): Promise<Phase4ClassificationFixture[]> {
    const classifications: {
      classification: AuthorityClassification;
      code: string;
      requiresDelegation: boolean;
      permitted: AuthorityActionType[];
      denied: AuthorityActionType[];
      extra?: (functionId: string) => Promise<void>;
    }[] = [
      {
        classification: AuthorityClassification.ABSEZ_OWNED,
        code: 'ABSEZ-OWNED',
        requiresDelegation: false,
        permitted: [AuthorityActionType.DECIDE, AuthorityActionType.ISSUE],
        denied: [],
      },
      {
        classification: AuthorityClassification.ABSEZ_DELEGATED,
        code: 'ABSEZ-DELEGATED',
        requiresDelegation: true,
        permitted: [AuthorityActionType.APPROVE],
        denied: [],
      },
      {
        classification: AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL,
        code: 'RETAINED-NATIONAL',
        requiresDelegation: false,
        permitted: [AuthorityActionType.DECIDE],
        denied: [],
        extra: async (functionId) => {
          await this.functions.createDependency({
            functionAuthorityRecordId: functionId,
            dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
          });
        },
      },
      {
        classification: AuthorityClassification.SHARED_OR_COORDINATED,
        code: 'SHARED-COORD',
        requiresDelegation: false,
        permitted: [AuthorityActionType.CONSULT, AuthorityActionType.APPROVE],
        denied: [],
      },
      {
        classification: AuthorityClassification.RESERVED_PROFESSIONAL,
        code: 'RESERVED-PROF',
        requiresDelegation: false,
        permitted: [AuthorityActionType.DECIDE],
        denied: [],
        extra: async (functionId) => {
          await this.functions.createDependency({
            functionAuthorityRecordId: functionId,
            dependencyType: AuthorityDependencyType.PROFESSIONAL_QUALIFICATION,
            externalAuthorityId: ctx.externalAuthorityId,
            configuration: { requiredQualifications: ['PROF-REG-SAMPLE'] },
          });
          await this.functions.createCondition({
            functionAuthorityRecordId: functionId,
            conditionType: AuthorityConditionType.QUALIFICATION_REQUIRED,
            configuration: { requiredQualifications: ['PROF-REG-SAMPLE'] },
          });
        },
      },
      {
        classification: AuthorityClassification.ADMINISTRATIVE_SUPPORT,
        code: 'ADMIN-SUPPORT',
        requiresDelegation: false,
        permitted: [AuthorityActionType.PREPARE, AuthorityActionType.CHECK],
        denied: [AuthorityActionType.DECIDE],
      },
      {
        classification: AuthorityClassification.TECHNOLOGY_ASSISTED,
        code: 'TECH-ASSISTED',
        requiresDelegation: false,
        permitted: [
          AuthorityActionType.RETRIEVE,
          AuthorityActionType.SUMMARIZE,
          AuthorityActionType.PREPARE,
          AuthorityActionType.CHECK,
        ],
        denied: [AuthorityActionType.DECIDE, AuthorityActionType.SIGN, AuthorityActionType.ISSUE],
      },
      {
        classification: AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED,
        code: 'PROHIBITED',
        requiresDelegation: false,
        permitted: [],
        denied: [AuthorityActionType.DECIDE],
      },
    ];

    const fixtures: Phase4ClassificationFixture[] = [];

    for (const item of classifications) {
      const source = await this.governingSources.create({
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-${item.code}-SRC`,
        title: `NON_PRODUCTION ${item.code} Source`,
        versionLabel: '1.0.0',
        content: `${NON_PRODUCTION_FIXTURE_MARKER} sample content for ${item.code}`,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      });

      await this.governingSources.authenticate(source.id, {
        authenticatedByIdentityId: ctx.actorIdentityId,
      });

      const record = await this.functions.create({
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-${item.code}`,
        name: `NON_PRODUCTION ${item.code} Function`,
        description: `${NON_PRODUCTION_FIXTURE_MARKER} sample function`,
        classification: item.classification,
        functionClass: ControlledFunctionClass.OTHER,
        institutionId: ctx.institutionId,
        officeId: ctx.officeId,
        requiresDelegation: item.requiresDelegation,
      });

      await this.functions.linkGoverningSource({
        functionAuthorityRecordId: record.id,
        governingSourceId: source.id,
      });

      await this.functions.createAssignment({
        functionAuthorityRecordId: record.id,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        institutionId: ctx.institutionId,
        effectiveFrom: new Date('2020-01-01'),
      });

      for (const action of item.permitted) {
        await this.functions.createActionRight({
          functionAuthorityRecordId: record.id,
          action,
          permitted: true,
          requiresHumanActor:
            item.classification === AuthorityClassification.TECHNOLOGY_ASSISTED
              ? action === AuthorityActionType.RETRIEVE ||
                action === AuthorityActionType.SUMMARIZE ||
                action === AuthorityActionType.PREPARE ||
                action === AuthorityActionType.CHECK
              : true,
        });
      }

      for (const action of item.denied) {
        await this.functions.createActionRight({
          functionAuthorityRecordId: record.id,
          action,
          permitted: false,
        });
      }

      if (item.extra) {
        await item.extra(record.id);
      }

      if (item.classification !== AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED) {
        await this.activation.activate(record.id, {
          actorIdentityId: ctx.actorIdentityId,
          reason: `${NON_PRODUCTION_FIXTURE_MARKER} activation`,
        });
      }

      fixtures.push({
        marker: NON_PRODUCTION_FIXTURE_MARKER,
        classification: item.classification,
        functionId: record.id,
        functionCode: record.code,
        permittedActions: item.permitted,
        deniedActions: item.denied,
      });
    }

    return fixtures;
  }
}
