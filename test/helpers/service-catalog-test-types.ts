export interface ServiceFeeDefinitionBody {
  governingSourceId: string;
  fixedAmount: string | null;
  isCurrent: boolean;
  waived: false;
}

export interface ServiceLevelTargetBody {
  approved: false;
  isCurrent: boolean;
}

export interface ServiceDependencyDefinitionBody {
  authorityDependencyId: string | null;
  authorityTransferred: false;
  metadataOnly: true;
}

export interface ServiceOutputDefinitionBody {
  issued: false;
  outputType: string;
}

export interface ServiceRedressRouteBody {
  routeType: string;
  decided: false;
}

export function asServiceFeeDefinitionBody(body: unknown): ServiceFeeDefinitionBody {
  return body as ServiceFeeDefinitionBody;
}

export function asServiceFeeDefinitionListBody(body: unknown): ServiceFeeDefinitionBody[] {
  return body as ServiceFeeDefinitionBody[];
}

export function asServiceLevelTargetListBody(body: unknown): ServiceLevelTargetBody[] {
  return body as ServiceLevelTargetBody[];
}

export function asServiceDependencyDefinitionListBody(
  body: unknown,
): ServiceDependencyDefinitionBody[] {
  return body as ServiceDependencyDefinitionBody[];
}

export function asServiceOutputDefinitionListBody(body: unknown): ServiceOutputDefinitionBody[] {
  return body as ServiceOutputDefinitionBody[];
}

export function asServiceRedressRouteListBody(body: unknown): ServiceRedressRouteBody[] {
  return body as ServiceRedressRouteBody[];
}
