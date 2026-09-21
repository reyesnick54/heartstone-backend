import type { ServicePackManifestV1 } from '../common/manifest/manifest.types';

export const REPRESENTATIVE_SERVICE_PACK_MANIFEST: ServicePackManifestV1 = {
  manifestVersion: 'heartstone.service-pack/v1',
  servicePack: {
    code: 'immigration-services-pack',
    name: 'Immigration Services Pack',
    description: 'Representative immigration ministry service family',
    versionLabel: '1.0.0',
  },
  jurisdiction: {
    code: 'GD',
    name: 'Grenada',
  },
  institution: {
    code: 'IMM',
    name: 'Immigration Authority',
  },
  department: {
    code: 'IMM-VISAS',
    name: 'Visa Services Department',
  },
  services: [
    {
      code: 'visitor-visa',
      name: 'Visitor Visa Application',
      description: 'Temporary visitor visa intake',
    },
  ],
  authorityMappings: [
    {
      code: 'visitor-visa-authority',
      serviceCode: 'visitor-visa',
      functionAuthorityRecordCode: 'FAR-VISITOR-VISA-DETERMINATION',
    },
  ],
  forms: [
    {
      code: 'visitor-visa-form',
      name: 'Visitor Visa Intake Form',
      serviceCode: 'visitor-visa',
    },
  ],
  evidenceRequirements: [
    {
      code: 'passport-copy',
      name: 'Passport Copy',
      serviceCode: 'visitor-visa',
    },
  ],
  workflows: [
    {
      code: 'visitor-visa-workflow',
      name: 'Visitor Visa Processing Workflow',
      serviceCode: 'visitor-visa',
    },
  ],
  fees: [
    {
      code: 'visitor-visa-fee',
      name: 'Visitor Visa Application Fee',
      serviceCode: 'visitor-visa',
    },
  ],
  outputs: [
    {
      code: 'visitor-visa-decision-letter',
      name: 'Visitor Visa Decision Letter',
      serviceCode: 'visitor-visa',
    },
  ],
  slaRules: [
    {
      code: 'visitor-visa-sla',
      name: 'Visitor Visa Processing SLA',
      serviceCode: 'visitor-visa',
    },
  ],
  communications: [
    {
      code: 'visitor-visa-acknowledgement',
      name: 'Application Acknowledgement',
      serviceCode: 'visitor-visa',
    },
  ],
  integrations: [
    {
      code: 'border-system-check',
      name: 'Border System Verification',
      serviceCode: 'visitor-visa',
    },
  ],
  renewals: [
    {
      code: 'visitor-visa-renewal',
      name: 'Visitor Visa Renewal Pathway',
      serviceCode: 'visitor-visa',
    },
  ],
  compliance: [
    {
      code: 'visitor-visa-compliance',
      name: 'Visitor Visa Compliance Monitoring',
      serviceCode: 'visitor-visa',
    },
  ],
  redress: [
    {
      code: 'visitor-visa-redress',
      name: 'Visitor Visa Redress Route',
      serviceCode: 'visitor-visa',
    },
  ],
  dashboardDefinitions: [
    {
      code: 'visitor-visa-dashboard',
      name: 'Visitor Visa Operations Dashboard',
      serviceCode: 'visitor-visa',
    },
  ],
  dependencies: [
    {
      dependencyCode: 'existing-visas-department',
      dependencyKind: 'DEPARTMENT',
      referenceKind: 'department',
      referenceId: '00000000-0000-4000-8000-000000000001',
      controlScope: 'HEARTSTONE_CONTROLLED',
      isRequired: true,
    },
    {
      dependencyCode: 'national-id-provider',
      dependencyKind: 'IDENTITY_PROVIDER',
      referenceKind: 'integration',
      referenceCode: 'national-id-provider',
      controlScope: 'EXTERNAL',
      isRequired: true,
    },
  ],
};
