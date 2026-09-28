import { ABSEZ_ARTICLE9_DEPARTMENTS } from '../../../setup/data/absez-article9-departments.data';
import {
  ABSEZ_CUSTOMS_DELEGATED_FUNCTION_CODE,
  ABSEZ_IMMIGRATION_DELEGATED_FUNCTION_CODE,
} from '../absez-s18f.constants';

export interface AbsezArticle9ServicePathDefinition {
  departmentCode: string;
  servicePathKey: string;
  heartstoneModule: string;
  servicePackId?: string;
  delegatedFunctionCode?: string;
  retainedNationalAuthority?: boolean;
  governingSourceCode?: string;
  operationalDependencySummary?: string;
}

const DEPARTMENT_SERVICE_PATHS: Record<string, Omit<AbsezArticle9ServicePathDefinition, 'departmentCode'>> = {
  'ABSEZ-ART9-01': {
    servicePathKey: 'executive-office-coordination',
    heartstoneModule: 'experience/executive',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-02': {
    servicePathKey: 'legal-affairs-instrument-support',
    heartstoneModule: 'instruments',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-03': {
    servicePathKey: 'compliance-regulatory-coordination',
    heartstoneModule: 'compliance',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-04': {
    servicePathKey: 'finance-fee-assessment',
    heartstoneModule: 'revenue',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-05': {
    servicePathKey: 'hr-administration',
    heartstoneModule: 'operational-support',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-06': {
    servicePathKey: 'information-systems',
    heartstoneModule: 'technical-access',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-07': {
    servicePathKey: 'investor-one-stop-shop',
    heartstoneModule: 'absez/investor-relations',
    servicePackId: '09-business-investor-service.pack.json',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    operationalDependencySummary: 'Investor inquiry and case routing (coordination only).',
  },
  'ABSEZ-ART9-08': {
    servicePathKey: 'licensing-registration',
    heartstoneModule: 'absez/sez-licence',
    servicePackId: 'absez-sez-business-licence-pack',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-09': {
    servicePathKey: 'planning-development-liaison',
    heartstoneModule: 'planning-construction',
    servicePackId: 'template-planning-construction',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-10': {
    servicePathKey: 'environmental-coordination',
    heartstoneModule: 'compliance',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-11': {
    servicePathKey: 'security-safety-coordination',
    heartstoneModule: 'public-safety',
    servicePackId: 'template-public-safety-emergency',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-12': {
    servicePathKey: 'facilities-asset-management',
    heartstoneModule: 'property-registry',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    operationalDependencySummary: 'Zone land lease/concession records (not planning).',
  },
  'ABSEZ-ART9-13': {
    servicePathKey: 'procurement-supplies',
    heartstoneModule: 'operational-support',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-14': {
    servicePathKey: 'corporate-governance-secretariat',
    heartstoneModule: 'government',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-15': {
    servicePathKey: 'communications-stakeholder-relations',
    heartstoneModule: 'experience',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-16': {
    servicePathKey: 'internal-audit-assurance',
    heartstoneModule: 'audit-governance',
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
  'ABSEZ-ART9-17': {
    servicePathKey: 'immigration-coordination',
    heartstoneModule: 'immigration',
    servicePackId: 'non-production-immigration-residency-citizenship',
    delegatedFunctionCode: ABSEZ_IMMIGRATION_DELEGATED_FUNCTION_CODE,
    retainedNationalAuthority: true,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    operationalDependencySummary: 'National immigration authority retains determination.',
  },
  'ABSEZ-ART9-18': {
    servicePathKey: 'customs-coordination',
    heartstoneModule: 'customs-trade',
    servicePackId: 'customs-trade-service-pack',
    delegatedFunctionCode: ABSEZ_CUSTOMS_DELEGATED_FUNCTION_CODE,
    retainedNationalAuthority: true,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    operationalDependencySummary: 'National customs authority retains clearance determination.',
  },
  'ABSEZ-ART9-19': {
    servicePathKey: 'financial-services-licensing-coordination',
    heartstoneModule: 'financial-services',
    servicePackId: 'financial-services-administration',
    delegatedFunctionCode: 'ABSEZ-FN-FINANCIAL-LICENSING-FACILITATION',
    retainedNationalAuthority: true,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
  },
};

export const ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS: readonly AbsezArticle9ServicePathDefinition[] =
  ABSEZ_ARTICLE9_DEPARTMENTS.map((department) => {
    const path = DEPARTMENT_SERVICE_PATHS[department.code];
    if (!path) {
      throw new Error(`Missing Article 9 service path for ${department.code}`);
    }
    return {
      departmentCode: department.code,
      ...path,
    };
  });
