import { Injectable } from '@nestjs/common';
import {
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  GovernmentBodyType,
  InstitutionType,
  JurisdictionType,
  Prisma,
  RecordsClassificationStatus,
  RetentionDurationUnit,
  RetentionScheduleStatus,
  RetentionTriggerType,
  SetupConfigurationInstallationStatus,
  SetupConfigurationLayer,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { hashContent } from '../../authority/common/authority-hash.util';
import { PrismaService } from '../../database/prisma.service';
import { ABSEZ_ADVISORY_AGENCIES } from '../data/absez-advisory-agencies.data';
import { ABSEZ_ARTICLE9_DEPARTMENTS } from '../data/absez-article9-departments.data';
import { ABSEZ_CASE_CATEGORIES } from '../data/absez-case-categories.data';
import {
  ABSEZ_DELEGATED_FUNCTIONS,
  DELEGATED_FUNCTION_CLASSIFICATION,
  DELEGATED_FUNCTION_DEPENDENCY_BLOCKING,
} from '../data/absez-delegated-functions.data';
import { ABSEZ_ESCALATION_LEVELS } from '../data/absez-escalation-levels.data';
import {
  ABSEZ_GOVERNING_SOURCE_RELATIONSHIPS,
  ABSEZ_GOVERNING_SOURCES,
} from '../data/absez-governing-sources.data';
import { ABSEZ_SERVICE_STANDARDS } from '../data/absez-service-standards.data';
import { ABSEZ_SETUP_VOCABULARY } from '../data/absez-vocabulary.data';
import {
  ANTIGUA_JURISDICTION_DEFAULTS,
  HEARTSTONE_PLATFORM_DEFAULTS,
} from '../data/heartstone-platform-defaults.data';
import {
  ABSEZ_ADVISORY_COMMITTEE_BODY_CODE,
  ABSEZ_INSTITUTION_CODE,
  ABSEZ_INSTITUTION_PACKAGE_KEY,
  ABSEZ_SETUP_MANIFEST_METADATA_KEY,
  ABSEZ_SETUP_PACKAGE_VERSION,
  ADVISORY_PARTICIPATION_RELATIONSHIP_LABEL,
  ANTIGUA_JURISDICTION_CODE,
  ANTIGUA_JURISDICTION_PACKAGE_KEY,
  HEARTSTONE_PLATFORM_PACKAGE_KEY,
} from '../setup.constants';
import { checksumJson } from './setup-package-checksum.util';

export interface AbsezSetupBootstrapResult {
  packageVersion: string;
  jurisdictionId: string;
  institutionId: string;
  platformInstallationId: string;
  jurisdictionInstallationId: string;
  institutionInstallationId: string;
}

@Injectable()
export class AbsezSetupBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrapAbsezConfiguration(): Promise<AbsezSetupBootstrapResult> {
    const platformChecksum = checksumJson(HEARTSTONE_PLATFORM_DEFAULTS);
    const jurisdictionChecksum = checksumJson(ANTIGUA_JURISDICTION_DEFAULTS);
    const institutionManifestChecksum = checksumJson({
      departments: ABSEZ_ARTICLE9_DEPARTMENTS.length,
      agencies: ABSEZ_ADVISORY_AGENCIES.length,
      caseCategories: ABSEZ_CASE_CATEGORIES.length,
      serviceStandards: ABSEZ_SERVICE_STANDARDS.length,
      escalationLevels: ABSEZ_ESCALATION_LEVELS.length,
    });

    const platformPackage = await this.prisma.setupConfigurationPackage.upsert({
      where: {
        packageKey_version: {
          packageKey: HEARTSTONE_PLATFORM_PACKAGE_KEY,
          version: ABSEZ_SETUP_PACKAGE_VERSION,
        },
      },
      create: {
        packageKey: HEARTSTONE_PLATFORM_PACKAGE_KEY,
        version: ABSEZ_SETUP_PACKAGE_VERSION,
        layer: SetupConfigurationLayer.PLATFORM,
        title: 'HeartStone platform defaults',
        sourceLabel: 'HeartStone S11 platform layer',
        contentChecksum: platformChecksum,
        manifest: HEARTSTONE_PLATFORM_DEFAULTS,
      },
      update: {
        contentChecksum: platformChecksum,
        manifest: HEARTSTONE_PLATFORM_DEFAULTS,
      },
    });

    const jurisdictionPackage = await this.prisma.setupConfigurationPackage.upsert({
      where: {
        packageKey_version: {
          packageKey: ANTIGUA_JURISDICTION_PACKAGE_KEY,
          version: ABSEZ_SETUP_PACKAGE_VERSION,
        },
      },
      create: {
        packageKey: ANTIGUA_JURISDICTION_PACKAGE_KEY,
        version: ABSEZ_SETUP_PACKAGE_VERSION,
        layer: SetupConfigurationLayer.JURISDICTION,
        title: 'Antigua and Barbuda jurisdiction configuration',
        sourceLabel: 'HeartStone S11 jurisdiction layer',
        contentChecksum: jurisdictionChecksum,
        manifest: ANTIGUA_JURISDICTION_DEFAULTS,
      },
      update: {
        contentChecksum: jurisdictionChecksum,
        manifest: ANTIGUA_JURISDICTION_DEFAULTS,
      },
    });

    const institutionPackage = await this.prisma.setupConfigurationPackage.upsert({
      where: {
        packageKey_version: {
          packageKey: ABSEZ_INSTITUTION_PACKAGE_KEY,
          version: ABSEZ_SETUP_PACKAGE_VERSION,
        },
      },
      create: {
        packageKey: ABSEZ_INSTITUTION_PACKAGE_KEY,
        version: ABSEZ_SETUP_PACKAGE_VERSION,
        layer: SetupConfigurationLayer.INSTITUTION,
        title: 'ABSEZ institution setup',
        sourceLabel: 'HeartStone S11 ABSEZ institution layer',
        contentChecksum: institutionManifestChecksum,
        manifest: {
          version: ABSEZ_SETUP_PACKAGE_VERSION,
          institutionCode: ABSEZ_INSTITUTION_CODE,
        },
      },
      update: {
        contentChecksum: institutionManifestChecksum,
      },
    });

    const platformInstallation = await this.prisma.setupConfigurationInstallation.upsert({
      where: {
        packageId_scopeKey: {
          packageId: platformPackage.id,
          scopeKey: 'platform:global',
        },
      },
      create: {
        packageId: platformPackage.id,
        layer: SetupConfigurationLayer.PLATFORM,
        scopeKey: 'platform:global',
        status: SetupConfigurationInstallationStatus.INSTALLED,
        installationChecksum: platformChecksum,
        effectiveStatus: 'ACTIVE_CONFIGURATION',
        metadata: { inheritsFrom: null },
      },
      update: {
        installationChecksum: platformChecksum,
        status: SetupConfigurationInstallationStatus.INSTALLED,
        effectiveStatus: 'ACTIVE_CONFIGURATION',
      },
    });

    await this.prisma.systemMetadata.upsert({
      where: { key: 'setup:platform:defaults-version' },
      create: {
        key: 'setup:platform:defaults-version',
        value: ABSEZ_SETUP_PACKAGE_VERSION,
      },
      update: { value: ABSEZ_SETUP_PACKAGE_VERSION },
    });

    const jurisdiction = await this.prisma.jurisdiction.upsert({
      where: { code: ANTIGUA_JURISDICTION_CODE },
      create: {
        code: ANTIGUA_JURISDICTION_CODE,
        name: 'Antigua and Barbuda',
        description: 'National jurisdiction configuration for HeartStone ABSEZ installation.',
        type: JurisdictionType.NATIONAL,
        status: StructuralLifecycleStatus.ACTIVE,
      },
      update: {
        name: 'Antigua and Barbuda',
        type: JurisdictionType.NATIONAL,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const jurisdictionInstallation = await this.prisma.setupConfigurationInstallation.upsert({
      where: {
        packageId_scopeKey: {
          packageId: jurisdictionPackage.id,
          scopeKey: `jurisdiction:${ANTIGUA_JURISDICTION_CODE}`,
        },
      },
      create: {
        packageId: jurisdictionPackage.id,
        layer: SetupConfigurationLayer.JURISDICTION,
        scopeKey: `jurisdiction:${ANTIGUA_JURISDICTION_CODE}`,
        jurisdictionId: jurisdiction.id,
        parentInstallationId: platformInstallation.id,
        status: SetupConfigurationInstallationStatus.INSTALLED,
        installationChecksum: jurisdictionChecksum,
        effectiveStatus: 'ACTIVE_CONFIGURATION',
        metadata: {
          parentPackageKey: HEARTSTONE_PLATFORM_PACKAGE_KEY,
        },
      },
      update: {
        jurisdictionId: jurisdiction.id,
        parentInstallationId: platformInstallation.id,
        installationChecksum: jurisdictionChecksum,
        status: SetupConfigurationInstallationStatus.INSTALLED,
      },
    });

    await this.prisma.setupConfigurationOverride.upsert({
      where: {
        installationId_configurationKey: {
          installationId: jurisdictionInstallation.id,
          configurationKey: 'defaultCurrency',
        },
      },
      create: {
        installationId: jurisdictionInstallation.id,
        configurationKey: 'defaultCurrency',
        overrideValue: { value: ANTIGUA_JURISDICTION_DEFAULTS.defaultCurrency },
        inheritedFromLayer: SetupConfigurationLayer.PLATFORM,
        inheritedFromPackageKey: HEARTSTONE_PLATFORM_PACKAGE_KEY,
        auditNote: 'Jurisdiction layer override of platform default currency context.',
      },
      update: {
        overrideValue: { value: ANTIGUA_JURISDICTION_DEFAULTS.defaultCurrency },
      },
    });

    const institution = await this.prisma.institution.upsert({
      where: {
        jurisdictionId_code: {
          jurisdictionId: jurisdiction.id,
          code: ABSEZ_INSTITUTION_CODE,
        },
      },
      create: {
        jurisdictionId: jurisdiction.id,
        code: ABSEZ_INSTITUTION_CODE,
        name: 'Antigua and Barbuda Special Economic Zone Authority',
        description:
          'ABSEZ institution configuration (structural offices only; no officeholders seeded).',
        type: InstitutionType.SPECIAL_ECONOMIC_ZONE_AUTHORITY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
      update: {
        name: 'Antigua and Barbuda Special Economic Zone Authority',
        type: InstitutionType.SPECIAL_ECONOMIC_ZONE_AUTHORITY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const institutionInstallation = await this.prisma.setupConfigurationInstallation.upsert({
      where: {
        packageId_scopeKey: {
          packageId: institutionPackage.id,
          scopeKey: `institution:${ABSEZ_INSTITUTION_CODE}`,
        },
      },
      create: {
        packageId: institutionPackage.id,
        layer: SetupConfigurationLayer.INSTITUTION,
        scopeKey: `institution:${ABSEZ_INSTITUTION_CODE}`,
        jurisdictionId: jurisdiction.id,
        institutionId: institution.id,
        parentInstallationId: jurisdictionInstallation.id,
        status: SetupConfigurationInstallationStatus.INSTALLED,
        installationChecksum: institutionManifestChecksum,
        effectiveStatus: 'ACTIVE_CONFIGURATION',
        metadata: {
          parentPackageKey: ANTIGUA_JURISDICTION_PACKAGE_KEY,
        },
      },
      update: {
        jurisdictionId: jurisdiction.id,
        institutionId: institution.id,
        parentInstallationId: jurisdictionInstallation.id,
        installationChecksum: institutionManifestChecksum,
        status: SetupConfigurationInstallationStatus.INSTALLED,
      },
    });

    await this.prisma.governmentBody.upsert({
      where: {
        institutionId_code: {
          institutionId: institution.id,
          code: ABSEZ_ADVISORY_COMMITTEE_BODY_CODE,
        },
      },
      create: {
        institutionId: institution.id,
        code: ABSEZ_ADVISORY_COMMITTEE_BODY_CODE,
        name: 'Special Economic Zone Advisory Committee (configuration)',
        description:
          'Advisory committee structure for participating agency coordination. Advisory participation does not transfer national authority to ABSEZ.',
        type: GovernmentBodyType.ADVISORY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
      update: {
        name: 'Special Economic Zone Advisory Committee (configuration)',
        type: GovernmentBodyType.ADVISORY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    for (const department of ABSEZ_ARTICLE9_DEPARTMENTS) {
      const dept = await this.prisma.department.upsert({
        where: {
          institutionId_code: {
            institutionId: institution.id,
            code: department.code,
          },
        },
        create: {
          institutionId: institution.id,
          code: department.code,
          name: department.name,
          description: department.description,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          name: department.name,
          description: department.description,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });

      await this.prisma.office.upsert({
        where: {
          departmentId_code: {
            departmentId: dept.id,
            code: department.officeCode,
          },
        },
        create: {
          departmentId: dept.id,
          code: department.officeCode,
          name: department.officeName,
          description: 'Structural office placeholder — no officeholder seeded.',
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          name: department.officeName,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });
    }

    for (const agency of ABSEZ_ADVISORY_AGENCIES) {
      const external = await this.prisma.externalAuthority.upsert({
        where: { code: agency.code },
        create: {
          code: agency.code,
          name: agency.name,
          description: agency.description,
          type: agency.type,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          name: agency.name,
          description: agency.description,
          type: agency.type,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });

      await this.prisma.institutionExternalAuthority.upsert({
        where: {
          institutionId_externalAuthorityId: {
            institutionId: institution.id,
            externalAuthorityId: external.id,
          },
        },
        create: {
          institutionId: institution.id,
          externalAuthorityId: external.id,
          relationshipLabel: ADVISORY_PARTICIPATION_RELATIONSHIP_LABEL,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          relationshipLabel: ADVISORY_PARTICIPATION_RELATIONSHIP_LABEL,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });
    }

    for (const category of ABSEZ_CASE_CATEGORIES) {
      await this.prisma.institutionCaseCategory.upsert({
        where: {
          institutionId_code: {
            institutionId: institution.id,
            code: category.code,
          },
        },
        create: {
          institutionId: institution.id,
          code: category.code,
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder,
          protocolReference: category.protocolReference,
          routingConfiguration: category.routingConfiguration,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder,
          protocolReference: category.protocolReference,
          routingConfiguration: category.routingConfiguration,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });
    }

    for (const standard of ABSEZ_SERVICE_STANDARDS) {
      await this.prisma.institutionServiceStandard.upsert({
        where: {
          institutionId_code: {
            institutionId: institution.id,
            code: standard.code,
          },
        },
        create: {
          institutionId: institution.id,
          code: standard.code,
          label: standard.label,
          targetDurationHours: standard.targetDurationHours,
          targetDurationDays: standard.targetDurationDays,
          businessDaysOnly: standard.businessDaysOnly,
          protocolReference: standard.protocolReference,
          policyConfiguration: standard.policyConfiguration as Prisma.InputJsonValue,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          label: standard.label,
          targetDurationHours: standard.targetDurationHours,
          targetDurationDays: standard.targetDurationDays,
          businessDaysOnly: standard.businessDaysOnly,
          protocolReference: standard.protocolReference,
          policyConfiguration: standard.policyConfiguration as Prisma.InputJsonValue,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });
    }

    for (const level of ABSEZ_ESCALATION_LEVELS) {
      await this.prisma.institutionEscalationLevel.upsert({
        where: {
          institutionId_levelNumber: {
            institutionId: institution.id,
            levelNumber: level.levelNumber,
          },
        },
        create: {
          institutionId: institution.id,
          levelNumber: level.levelNumber,
          code: level.code,
          label: level.label,
          policyConfiguration: level.policyConfiguration as Prisma.InputJsonValue,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          code: level.code,
          label: level.label,
          policyConfiguration: level.policyConfiguration as Prisma.InputJsonValue,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });
    }

    for (const entry of ABSEZ_SETUP_VOCABULARY) {
      await this.prisma.setupVocabularyEntry.upsert({
        where: {
          vocabularyKind_code_institutionId: {
            vocabularyKind: entry.vocabularyKind,
            code: entry.code,
            institutionId: institution.id,
          },
        },
        create: {
          institutionId: institution.id,
          vocabularyKind: entry.vocabularyKind,
          code: entry.code,
          label: entry.label,
          meaning: entry.meaning,
          layer: entry.layer,
          configuration: (entry.configuration ?? {}) as Prisma.InputJsonValue,
          status: StructuralLifecycleStatus.ACTIVE,
        },
        update: {
          label: entry.label,
          meaning: entry.meaning,
          configuration: (entry.configuration ?? {}) as Prisma.InputJsonValue,
          status: StructuralLifecycleStatus.ACTIVE,
        },
      });
    }

    const governingSourceIds = new Map<string, string>();
    for (const source of ABSEZ_GOVERNING_SOURCES) {
      const contentHash = hashContent(source.content);
      const record = await this.prisma.governingSource.upsert({
        where: { code: source.code },
        create: {
          code: source.code,
          title: source.title,
          versionLabel: source.versionLabel,
          status: GoverningSourceStatus.DRAFT,
          effectiveFrom: new Date(source.effectiveFromIso),
          contentHash,
          versions: {
            create: {
              versionLabel: source.versionLabel,
              contentHash,
            },
          },
        },
        update: {
          title: source.title,
          versionLabel: source.versionLabel,
          status: GoverningSourceStatus.DRAFT,
          effectiveFrom: new Date(source.effectiveFromIso),
          contentHash,
          authenticatedAt: null,
          authenticatedByIdentityId: null,
        },
      });
      governingSourceIds.set(source.code, record.id);
    }

    for (const relationship of ABSEZ_GOVERNING_SOURCE_RELATIONSHIPS) {
      const fromSourceId = governingSourceIds.get(relationship.fromCode);
      const toSourceId = governingSourceIds.get(relationship.toCode);
      if (!fromSourceId || !toSourceId) {
        continue;
      }
      const existing = await this.prisma.governingSourceRelationship.findFirst({
        where: {
          fromSourceId,
          toSourceId,
          relationshipType: relationship.relationshipType,
        },
      });
      if (!existing) {
        await this.prisma.governingSourceRelationship.create({
          data: {
            fromSourceId,
            toSourceId,
            relationshipType: relationship.relationshipType,
          },
        });
      }
    }

    const protocolSourceId = governingSourceIds.get('ABSEZ-IMPL-PROTOCOL-UNEXEC');
    if (protocolSourceId) {
      const classification = await this.prisma.recordsClassification.upsert({
        where: { code: 'ABSEZ-RC-ADMIN-CASE' },
        create: {
          code: 'ABSEZ-RC-ADMIN-CASE',
          name: 'ABSEZ administrative case records',
          description: 'Records classification for ABSEZ case administrative files.',
          securityClassification: 'OFFICIAL',
          privacyClassification: 'LIMITED',
          governingSourceId: protocolSourceId,
          status: RecordsClassificationStatus.DRAFT,
        },
        update: {
          governingSourceId: protocolSourceId,
          status: RecordsClassificationStatus.DRAFT,
        },
      });

      const scheduleHash = hashContent('ABSEZ-RET-ADMIN-CASE-v1');
      await this.prisma.retentionSchedule.upsert({
        where: {
          code_versionNumber: {
            code: 'ABSEZ-RET-ADMIN-CASE',
            versionNumber: 1,
          },
        },
        create: {
          code: 'ABSEZ-RET-ADMIN-CASE',
          name: 'ABSEZ administrative case retention (configuration)',
          recordsClassificationId: classification.id,
          versionNumber: 1,
          retentionDurationValue: 7,
          retentionDurationUnit: RetentionDurationUnit.YEARS,
          triggerType: RetentionTriggerType.CASE_CLOSURE,
          triggerConfiguration: { setupLayer: 'INSTITUTION' },
          governingSourceId: protocolSourceId,
          effectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
          scheduleSnapshotHash: scheduleHash,
          status: RetentionScheduleStatus.DRAFT,
          rules: {
            create: {
              ruleOrder: 1,
              label: 'Post-closure minimum retention',
              triggerType: RetentionTriggerType.CASE_CLOSURE,
              durationValue: 7,
              durationUnit: RetentionDurationUnit.YEARS,
              minimumRetention: true,
            },
          },
        },
        update: {
          recordsClassificationId: classification.id,
          governingSourceId: protocolSourceId,
          scheduleSnapshotHash: scheduleHash,
          status: RetentionScheduleStatus.DRAFT,
        },
      });
    }

    for (const fn of ABSEZ_DELEGATED_FUNCTIONS) {
      const governingSourceId = governingSourceIds.get(fn.governingSourceCode);
      const delegatingInstrumentId = governingSourceIds.get(fn.delegatingInstrumentCode);
      if (!governingSourceId || !delegatingInstrumentId) {
        continue;
      }

      let externalAuthorityId: string | undefined;
      if (fn.externalAgencyCode) {
        const ext = await this.prisma.externalAuthority.findUnique({
          where: { code: fn.externalAgencyCode },
        });
        externalAuthorityId = ext?.id;
      }

      const record = await this.prisma.functionAuthorityRecord.upsert({
        where: { code: fn.code },
        create: {
          code: fn.code,
          name: fn.name,
          description: fn.description,
          classification: DELEGATED_FUNCTION_CLASSIFICATION,
          functionClass: fn.functionClass,
          lifecycleStatus: FunctionAuthorityLifecycleStatus.DRAFT,
          institutionId: institution.id,
          requiresDelegation: true,
          governingSources: {
            create: { governingSourceId, isPrimary: true },
          },
          dependencies: {
            create: {
              dependencyType: fn.dependencyType,
              externalAuthorityId,
              competentAuthorityLabel: fn.competentAuthorityLabel,
              blockingStatus: DELEGATED_FUNCTION_DEPENDENCY_BLOCKING,
              sourceProvision: fn.delegatingInstrumentCode,
              requiredEvidenceReference: delegatingInstrumentId,
              configuration: {
                delegatingInstrumentCode: fn.delegatingInstrumentCode,
                instrumentMustBeAuthenticated: true,
              },
            },
          },
        },
        update: {
          name: fn.name,
          description: fn.description,
          classification: DELEGATED_FUNCTION_CLASSIFICATION,
          lifecycleStatus: FunctionAuthorityLifecycleStatus.DRAFT,
          institutionId: institution.id,
          requiresDelegation: true,
          activatedAt: null,
          activatedByIdentityId: null,
        },
      });

      const linkExists = await this.prisma.functionGoverningSource.findFirst({
        where: {
          functionAuthorityRecordId: record.id,
          governingSourceId,
        },
      });
      if (!linkExists) {
        await this.prisma.functionGoverningSource.create({
          data: {
            functionAuthorityRecordId: record.id,
            governingSourceId,
            isPrimary: true,
          },
        });
      }

      const dependencyExists = await this.prisma.authorityDependency.findFirst({
        where: {
          functionAuthorityRecordId: record.id,
          sourceProvision: fn.delegatingInstrumentCode,
        },
      });
      if (!dependencyExists) {
        await this.prisma.authorityDependency.create({
          data: {
            functionAuthorityRecordId: record.id,
            dependencyType: fn.dependencyType,
            externalAuthorityId,
            competentAuthorityLabel: fn.competentAuthorityLabel,
            blockingStatus: DELEGATED_FUNCTION_DEPENDENCY_BLOCKING,
            sourceProvision: fn.delegatingInstrumentCode,
            requiredEvidenceReference: delegatingInstrumentId,
            configuration: {
              delegatingInstrumentCode: fn.delegatingInstrumentCode,
              instrumentMustBeAuthenticated: true,
            },
          },
        });
      }
    }

    await this.prisma.systemMetadata.upsert({
      where: { key: ABSEZ_SETUP_MANIFEST_METADATA_KEY },
      create: {
        key: ABSEZ_SETUP_MANIFEST_METADATA_KEY,
        value: ABSEZ_SETUP_PACKAGE_VERSION,
      },
      update: { value: ABSEZ_SETUP_PACKAGE_VERSION },
    });

    return {
      packageVersion: ABSEZ_SETUP_PACKAGE_VERSION,
      jurisdictionId: jurisdiction.id,
      institutionId: institution.id,
      platformInstallationId: platformInstallation.id,
      jurisdictionInstallationId: jurisdictionInstallation.id,
      institutionInstallationId: institutionInstallation.id,
    };
  }
}
