import {
  IntegrationEndpointDirection,
  IntegrationRequestStatus,
  RegistryQueryStatus,
} from '@prisma/client';

export interface RegistryQueryInput {
  queryReference: string;
  identifier: string;
  identifierType?: string;
}

export interface RegistryQueryResult {
  identifier: string;
  identifierType: string;
  status: string;
  registeredName: string;
  lastUpdatedAt: string;
  attributes: Record<string, string>;
}

export interface RegistryAdapterPort {
  readonly externalSystemCode: string;
  query(input: RegistryQueryInput): Promise<RegistryQueryResult>;
  validateResponse(payload: RegistryQueryResult): void;
}

export const REGISTRY_ADAPTER_PORT = Symbol('REGISTRY_ADAPTER_PORT');

export const REGISTRY_RESPONSE_SCHEMA_FIELDS = [
  'identifier',
  'identifierType',
  'status',
  'registeredName',
  'lastUpdatedAt',
  'attributes',
] as const;

export type RegistryResponseSchemaField = (typeof REGISTRY_RESPONSE_SCHEMA_FIELDS)[number];

export function assertRegistryResponseSchema(payload: RegistryQueryResult): void {
  for (const field of REGISTRY_RESPONSE_SCHEMA_FIELDS) {
    if (!(field in payload)) {
      throw new Error(`Registry response missing required field "${field}"`);
    }
  }
}

export const DEFAULT_REGISTRY_QUERY_STATUS = RegistryQueryStatus.PENDING;
export const DEFAULT_INTEGRATION_REQUEST_STATUS = IntegrationRequestStatus.PENDING;
export const DEFAULT_ENDPOINT_DIRECTION = IntegrationEndpointDirection.OUTBOUND;
