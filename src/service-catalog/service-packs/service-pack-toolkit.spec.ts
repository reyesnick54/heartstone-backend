import * as fs from 'node:fs';
import * as path from 'node:path';

import { calculateServicePackFingerprint } from './calculate-service-pack-fingerprint';
import { formatServicePackManifest } from './canonical-json.util';
import {
  BENEFIT_ENTITLEMENT_TEMPLATE,
  BUSINESS_INVESTOR_TEMPLATE,
  CANONICAL_SERVICE_PACK_TEMPLATES,
  CANONICAL_TEMPLATE_FILE_NAMES,
  EXTERNAL_AUTHORITY_TEMPLATE,
  HIGH_SENSITIVITY_TEMPLATE,
  INSPECTION_DEPENDENT_TEMPLATE,
  LICENSE_PERMIT_TEMPLATE,
  MULTI_DEPARTMENT_TEMPLATE,
  PROFESSIONAL_REVIEW_TEMPLATE,
  RENEWAL_TEMPLATE,
  SIMPLE_REGISTRATION_TEMPLATE,
} from './canonical-templates';
import { compareServicePackVersions, diffServicePacks } from './diff-service-packs';
import { generateCompilationReport } from './generate-compilation-report';
import { type ServicePackManifest } from './service-pack.types';
import { validateServicePackManifest } from './validate-service-pack';

const TEMPLATES_DIR = path.join(process.cwd(), 'service-packs', 'templates');

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function firstService(manifest: ServicePackManifest) {
  const service = manifest.services[0];
  if (!service) {
    throw new Error('Expected at least one service in manifest');
  }
  return service;
}

describe('Service-Pack authoring toolkit', () => {
  describe('canonical templates', () => {
    it.each(
      CANONICAL_SERVICE_PACK_TEMPLATES.map((template, index) => [
        CANONICAL_TEMPLATE_FILE_NAMES[index],
        template,
      ]),
    )('validates template %s', (_fileName, template) => {
      const result = validateServicePackManifest(template);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it.each(CANONICAL_SERVICE_PACK_TEMPLATES)('marks template %s as NON_PRODUCTION', (template) => {
      expect(template.description).toMatch(/NON_PRODUCTION|TEMPLATE ONLY/);
      expect(['NON_PRODUCTION', 'TEMPLATE_ONLY']).toContain(template.packLabel);
    });

    it('loads every on-disk example template when present', () => {
      for (const fileName of CANONICAL_TEMPLATE_FILE_NAMES) {
        const filePath = path.join(TEMPLATES_DIR, fileName);
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ServicePackManifest;
        const result = validateServicePackManifest(manifest);
        expect(result.valid).toBe(true);
        expect(manifest.description).toMatch(/NON_PRODUCTION|TEMPLATE ONLY/);
      }
    });
  });

  it('rejects invalid authority mapping', () => {
    const invalid = clone(SIMPLE_REGISTRATION_TEMPLATE);
    const service = firstService(invalid);
    const authorityFunction = service.authorityFunctions[0];
    if (!authorityFunction) {
      throw new Error('Expected authority function');
    }
    authorityFunction.functionCode = 'UNKNOWN-AUTHORITY-CODE';

    const result = validateServicePackManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'INVALID_AUTHORITY_MAPPING')).toBe(true);
  });

  it('rejects activation governance bypass via maturityStatus field', () => {
    const invalid = clone(SIMPLE_REGISTRATION_TEMPLATE) as ServicePackManifest & {
      maturityStatus: string;
    };
    invalid.maturityStatus = 'ACTIVE';

    const result = validateServicePackManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'ACTIVATION_GOVERNANCE_BYPASS')).toBe(true);
  });

  it('rejects templates that declare operational public availability in deploymentIntent', () => {
    const invalid = clone(SIMPLE_REGISTRATION_TEMPLATE);
    invalid.deploymentIntent.targetPublicAvailability =
      'ACTIVE' as typeof invalid.deploymentIntent.targetPublicAvailability;

    const result = validateServicePackManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'ACTIVATION_GOVERNANCE_BYPASS')).toBe(true);
  });

  it('flags service removal as high-risk', () => {
    const before = clone(LICENSE_PERMIT_TEMPLATE);
    const after = clone(LICENSE_PERMIT_TEMPLATE);
    after.services = [];

    const diff = diffServicePacks(before, after);
    expect(diff.highRiskChanges.some((entry) => entry.highRiskType === 'SERVICE_REMOVED')).toBe(
      true,
    );
    expect(diff.highRiskChanges[0]?.requiresInstitutionalReview).toBe(true);
  });

  it('flags evidence requirement removal as high-risk', () => {
    const before = clone(LICENSE_PERMIT_TEMPLATE);
    const after = clone(LICENSE_PERMIT_TEMPLATE);
    const service = firstService(after);
    service.evidenceRequirements = service.evidenceRequirements.slice(1);

    const diff = diffServicePacks(before, after);
    expect(
      diff.highRiskChanges.some((entry) => entry.highRiskType === 'EVIDENCE_REQUIREMENT_REMOVED'),
    ).toBe(true);
  });

  it('flags decision actor change as high-risk', () => {
    const before = clone(LICENSE_PERMIT_TEMPLATE);
    const after = clone(LICENSE_PERMIT_TEMPLATE);
    const decisionStage = firstService(after).decisionStages[0];
    if (!decisionStage) {
      throw new Error('Expected decision stage');
    }
    decisionStage.decisionActorFunctionCode = 'TEMPLATE-AUTH-REGISTRATION-VERIFY';

    const diff = diffServicePacks(before, after);
    expect(
      diff.highRiskChanges.some((entry) => entry.highRiskType === 'DECISION_ACTOR_CHANGE'),
    ).toBe(true);
  });

  it('flags dangerous diff categories without auto-approving them', () => {
    const before = clone(EXTERNAL_AUTHORITY_TEMPLATE);
    const after = clone(EXTERNAL_AUTHORITY_TEMPLATE);
    const service = firstService(after);
    service.dependencies.push({
      dependencyCode: 'NEW-INTEGRATION',
      dependencyType: 'EXTERNAL_AUTHORITY',
      description: 'New integration',
      externalIntegrationCode: 'NEW-EXT-API',
    });
    service.fees.push({
      feeCode: 'NEW-FEE',
      label: 'New fee',
      amount: 999,
      currencyCode: 'USD',
      waivable: false,
    });

    const diff = diffServicePacks(before, after);
    expect(diff.highRiskChanges.length).toBeGreaterThan(0);
    expect(diff.highRiskChanges.every((entry) => entry.requiresInstitutionalReview)).toBe(true);
    expect(diff.highRiskChanges.every((entry) => entry.highRisk)).toBe(true);
  });

  it('produces deterministic fingerprints', () => {
    const first = calculateServicePackFingerprint(SIMPLE_REGISTRATION_TEMPLATE);
    const second = calculateServicePackFingerprint(clone(SIMPLE_REGISTRATION_TEMPLATE));

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });

  it('produces deterministic formatting', () => {
    const first = formatServicePackManifest(SIMPLE_REGISTRATION_TEMPLATE);
    const second = formatServicePackManifest(clone(SIMPLE_REGISTRATION_TEMPLATE));

    expect(first).toBe(second);
  });

  it('reports fingerprint change in version comparison', () => {
    const before = clone(RENEWAL_TEMPLATE);
    const after = clone(RENEWAL_TEMPLATE);
    after.packVersion = '1.1.0';
    const slaRule = firstService(after).slaRules[0];
    if (!slaRule) {
      throw new Error('Expected SLA rule');
    }
    slaRule.targetDays = 20;

    const comparison = compareServicePackVersions(before, after);
    expect(comparison.fingerprintChanged).toBe(true);
    expect(comparison.fromFingerprint).not.toBe(comparison.toFingerprint);
  });

  it('compiles valid manifests with human-readable output', () => {
    const report = generateCompilationReport(PROFESSIONAL_REVIEW_TEMPLATE);

    expect(report.fingerprint).toHaveLength(64);
    expect(report.governanceSummary.activationGovernancePreserved).toBe(true);
    expect(report.humanReadableSummary).toContain('Service Pack Compilation Report');
    expect(report.humanReadableSummary).toContain('Institutional acceptance required: yes');
  });

  it('covers all ten canonical template archetypes', () => {
    expect(CANONICAL_SERVICE_PACK_TEMPLATES).toHaveLength(10);
    expect(CANONICAL_TEMPLATE_FILE_NAMES).toHaveLength(10);

    const packIds = new Set(CANONICAL_SERVICE_PACK_TEMPLATES.map((template) => template.packId));
    expect(packIds.size).toBe(10);

    const expectedArchetypes = [
      SIMPLE_REGISTRATION_TEMPLATE.packId,
      LICENSE_PERMIT_TEMPLATE.packId,
      RENEWAL_TEMPLATE.packId,
      INSPECTION_DEPENDENT_TEMPLATE.packId,
      EXTERNAL_AUTHORITY_TEMPLATE.packId,
      PROFESSIONAL_REVIEW_TEMPLATE.packId,
      MULTI_DEPARTMENT_TEMPLATE.packId,
      BENEFIT_ENTITLEMENT_TEMPLATE.packId,
      BUSINESS_INVESTOR_TEMPLATE.packId,
      HIGH_SENSITIVITY_TEMPLATE.packId,
    ];

    for (const packId of expectedArchetypes) {
      expect(packIds.has(packId)).toBe(true);
    }
  });

  it('flags review gate reduction when a substantive stage is removed', () => {
    const before = clone(HIGH_SENSITIVITY_TEMPLATE);
    const after = clone(HIGH_SENSITIVITY_TEMPLATE);
    const service = firstService(after);
    service.workflowStages = service.workflowStages.filter(
      (stage) => stage.stageKey !== 'sensitivity-review',
    );

    const diff = diffServicePacks(before, after);
    expect(
      diff.highRiskChanges.some((entry) => entry.highRiskType === 'WORKFLOW_STAGE_REMOVED'),
    ).toBe(true);
  });
});
