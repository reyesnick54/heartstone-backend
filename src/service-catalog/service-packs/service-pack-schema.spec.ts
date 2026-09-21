import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  SERVICE_PACK_AUDIT_EVENT_TYPES,
  SERVICE_PACK_BINDING_DOMAINS,
  SERVICE_PACK_DEPLOYMENT_MODEL_NAMES,
  SERVICE_PACK_DEPLOYMENT_STATUSES,
  SERVICE_PACK_VERSION_STATUSES,
} from './service-pack-deployment.constants';

const SCHEMA_PATH = join(__dirname, '../../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Service pack deployment schema coherence', () => {
  const schema = readSchema();

  it('defines all canonical service pack deployment models', () => {
    for (const modelName of SERVICE_PACK_DEPLOYMENT_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all canonical service pack version statuses', () => {
    const block = extractEnumBlock(schema, 'ServicePackVersionStatus');
    for (const status of SERVICE_PACK_VERSION_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines all canonical deployment lifecycle statuses including deployed and active as distinct states', () => {
    const block = extractEnumBlock(schema, 'ServicePackDeploymentStatus');
    for (const status of SERVICE_PACK_DEPLOYMENT_STATUSES) {
      expect(block).toContain(status);
    }
    expect(block).toContain('DEPLOYED');
    expect(block).toContain('ACTIVE');
    expect(block).toContain('OPERATIONALLY_INACTIVE');
  });

  it('defines binding domains for all governed configuration areas', () => {
    const block = extractEnumBlock(schema, 'ServicePackDeploymentBindingDomain');
    for (const domain of SERVICE_PACK_BINDING_DOMAINS) {
      expect(block).toContain(domain);
    }
  });

  it('defines audit event types for deployment lifecycle transitions', () => {
    const block = extractEnumBlock(schema, 'ServicePackDeploymentAuditEventType');
    for (const eventType of SERVICE_PACK_AUDIT_EVENT_TYPES) {
      expect(block).toContain(eventType);
    }
  });

  it('persists exact ServicePackVersion reference on deployments', () => {
    const block = extractModelBlock(schema, 'ServicePackDeployment');
    expect(block).toContain('servicePackVersionId');
    expect(block).toContain('servicePackVersion');
  });

  it('persists configuration fingerprints on deployments', () => {
    const block = extractModelBlock(schema, 'ServicePackDeployment');
    expect(block).toContain('configurationFingerprint');
  });

  it('tracks reversible and activated binding state separately from deployment status', () => {
    const start = schema.indexOf('model ServicePackDeploymentBinding');
    const end = schema.indexOf('@@map("service_pack_deployment_bindings")', start);
    const block = schema.slice(start, end);
    expect(block).toContain('isReversible');
    expect(block).toContain('isActivated');
  });

  it('links service packs to institutions without duplicating authority fields', () => {
    const block = extractModelBlock(schema, 'ServicePack');
    expect(block).toContain('institutionId');
    expect(block).not.toContain('FunctionAuthorityRecord');
    expect(block).not.toContain('lifecycleStatus');
  });
});
