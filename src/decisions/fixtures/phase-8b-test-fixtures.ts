import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  CaseStatus,
  ControlledFunctionClass,
  DecisionTypeVersionStatus,
  EvidencePacketPurpose,
  EvidencePacketVersionStatus,
  FormVersionStatus,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  GovernmentServiceMaturityStatus,
  IdentityType,
  InstitutionType,
  JurisdictionType,
  Prisma,
  WorkflowVersionStatus,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { NON_PRODUCTION_DECISIONS_FIXTURE_MARKER } from '../decisions.constants';
import { type DecisionRequirementsConfig } from '../decisions.types';

export interface Phase8bFixtureContext {
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  officeId: string;
  officeholderId: string;
  appointmentId: string;
  decisionMakerIdentityId: string;
  functionAuthorityRecordId: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  decisionTypeId: string;
  decisionTypeVersionId: string;
  caseId: string;
  masterAdministrativeFileId: string;
  evidencePacketVersionId: string;
  permissibleOutcomes: string[];
}

export async function seedPhase8bDecisionFixture(
  prisma: PrismaService,
  overrides?: Partial<{
    caseStatus: CaseStatus;
    packetFrozen: boolean;
    readyForDecisionReview: boolean;
    requirements: DecisionRequirementsConfig;
    permissibleOutcomes: string[];
  }>,
): Promise<Phase8bFixtureContext> {
  const marker = NON_PRODUCTION_DECISIONS_FIXTURE_MARKER;

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${marker}-JUR`,
      name: 'Phase 8B Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST`,
      name: 'Phase 8B Institution',
      type: InstitutionType.AGENCY,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${marker}-DEPT`,
      name: 'Phase 8B Department',
    },
  });

  const office = await prisma.office.create({
    data: {
      departmentId: department.id,
      code: `${marker}-OFF`,
      name: 'Phase 8B Office',
    },
  });

  const officeholder = await prisma.officeholder.create({
    data: { code: `${marker}-OH`, name: 'Phase 8B Decision Maker' },
  });

  const appointment = await prisma.appointment.create({
    data: {
      officeId: office.id,
      officeholderId: officeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const person = await prisma.person.create({
    data: { givenName: 'Decision', familyName: 'Maker' },
  });

  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      personId: person.id,
      displayName: 'Phase 8B Decision Maker',
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: { identityId: identity.id, officeholderId: officeholder.id, status: 'ACTIVE' },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${marker}-SRC`,
      title: 'Phase 8B Governing Source',
      versionLabel: '1.0',
      status: GoverningSourceStatus.AUTHENTICATED,
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      contentHash: 'phase8b-hash',
    },
  });

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-DECIDE`,
      name: 'Phase 8B Decision Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: institution.id,
      officeId: office.id,
      activatedAt: new Date('2020-01-01'),
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
      assignments: {
        create: {
          officeholderId: officeholder.id,
          officeId: office.id,
          institutionId: institution.id,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      },
      actionRights: {
        create: [{ action: AuthorityActionType.DECIDE, permitted: true, requiresHumanActor: true }],
      },
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: { code: `${marker}-FAM`, name: 'Phase 8B Family' },
  });

  const governmentService = await prisma.governmentService.create({
    data: {
      code: `${marker}-SVC`,
      slug: `${marker.toLowerCase()}-svc`,
      officialName: 'Phase 8B Service',
      publicName: 'Phase 8B Service',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
    },
  });

  const governmentServiceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: governmentService.id,
      version: '1.0',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
    },
  });

  const decisionType = await prisma.decisionType.create({
    data: {
      code: `${marker}-DT`,
      name: 'Phase 8B Decision Type',
      governmentServiceId: governmentService.id,
    },
  });

  const permissibleOutcomes = overrides?.permissibleOutcomes ?? ['APPROVED', 'REFUSED'];

  const decisionTypeVersion = await prisma.decisionTypeVersion.create({
    data: {
      decisionTypeId: decisionType.id,
      version: '1.0',
      status: DecisionTypeVersionStatus.ACTIVE,
      governmentServiceVersionId: governmentServiceVersion.id,
      functionAuthorityRecordId: functionRecord.id,
      permissibleOutcomes,
      requirementsConfig: (overrides?.requirements ?? {
        requiredEvidencePacketPurpose: EvidencePacketPurpose.DECISION_SUPPORT,
        requiredRequirementCodes: [],
      }) as Prisma.InputJsonValue,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const application = await prisma.application.create({
    data: {
      applicantIdentityId: identity.id,
      governmentServiceId: governmentService.id,
      governmentServiceVersionId: governmentServiceVersion.id,
      formDefinitionId: (
        await prisma.formDefinition.create({
          data: {
            code: `${marker}-FORM`,
            name: 'Phase 8B Form',
            governmentServiceVersionId: governmentServiceVersion.id,
          },
        })
      ).id,
      formVersionId: (
        await prisma.formVersion.create({
          data: {
            formDefinitionId: (
              await prisma.formDefinition.findFirstOrThrow({
                where: { code: `${marker}-FORM` },
              })
            ).id,
            version: 1,
            title: { en: 'Phase 8B Form' },
            status: FormVersionStatus.PUBLISHED,
          },
        })
      ).id,
      configurationFingerprint: 'phase8b-fingerprint',
      applicantCategory: 'INDIVIDUAL',
      status: 'SUBMITTED',
    },
  });

  const caseRecord = await prisma.case.create({
    data: {
      caseNumber: `${marker}-CASE-001`,
      applicationId: application.id,
      applicantIdentityId: identity.id,
      governmentServiceId: governmentService.id,
      governmentServiceVersionId: governmentServiceVersion.id,
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      workflowVersionId: (
        await prisma.workflowVersion.create({
          data: {
            workflowDefinitionId: (
              await prisma.workflowDefinition.create({
                data: {
                  code: `${marker}-WF`,
                  name: 'Phase 8B Workflow',
                  governmentServiceId: governmentService.id,
                },
              })
            ).id,
            version: '1.0',
            status: WorkflowVersionStatus.APPROVED,
          },
        })
      ).id,
      configurationFingerprint: 'phase8b-fingerprint',
      status: overrides?.caseStatus ?? CaseStatus.DECISION_PENDING,
    },
  });

  const masterFile = await prisma.masterAdministrativeFile.create({
    data: {
      fileNumber: `${marker}-MAF-001`,
      caseId: caseRecord.id,
      applicationId: application.id,
      governmentServiceId: governmentService.id,
      governmentServiceVersionId: governmentServiceVersion.id,
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      administrativeOwnerOfficeId: office.id,
      recordsCustodianOfficeId: office.id,
      authoritativeRecordLocationReference: 'phase8b-location',
    },
  });

  const packet = await prisma.evidencePacket.create({
    data: {
      packetNumber: `${marker}-PKT-001`,
      masterAdministrativeFileId: masterFile.id,
      caseId: caseRecord.id,
      purpose: EvidencePacketPurpose.DECISION_SUPPORT,
      questionOrIssue: 'Decision support packet',
      responsibleDepartmentId: department.id,
    },
  });

  const packetVersion = await prisma.evidencePacketVersion.create({
    data: {
      packetId: packet.id,
      version: 1,
      status: overrides?.packetFrozen
        ? EvidencePacketVersionStatus.FROZEN
        : EvidencePacketVersionStatus.DRAFT,
      assembledByIdentityId: identity.id,
      assembledByOfficeholderId: officeholder.id,
      frozenAt: overrides?.packetFrozen ? new Date() : null,
      manifestHash: overrides?.packetFrozen ? 'frozen-hash' : null,
      readyForDecisionReview: overrides?.readyForDecisionReview ?? true,
    },
  });

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    departmentId: department.id,
    officeId: office.id,
    officeholderId: officeholder.id,
    appointmentId: appointment.id,
    decisionMakerIdentityId: identity.id,
    functionAuthorityRecordId: functionRecord.id,
    governmentServiceId: governmentService.id,
    governmentServiceVersionId: governmentServiceVersion.id,
    decisionTypeId: decisionType.id,
    decisionTypeVersionId: decisionTypeVersion.id,
    caseId: caseRecord.id,
    masterAdministrativeFileId: masterFile.id,
    evidencePacketVersionId: packetVersion.id,
    permissibleOutcomes,
  };
}
