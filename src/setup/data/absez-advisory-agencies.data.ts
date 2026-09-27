import { ExternalAuthorityType } from '@prisma/client';

/** Participating / advisory national agencies (stable codes; participation ≠ delegated ABSEZ authority). */
export interface AbsezAdvisoryAgencyDefinition {
  code: string;
  name: string;
  description: string;
  type: ExternalAuthorityType;
}

export const ABSEZ_ADVISORY_AGENCIES: readonly AbsezAdvisoryAgencyDefinition[] = [
  {
    code: 'AG-NATL-ADV-CUSTOMS',
    name: 'Comptroller of Customs (Antigua and Barbuda)',
    description:
      'National customs authority — advisory/participating agency for zone coordination.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-INLAND-REVENUE',
    name: 'Commissioner of Inland Revenue (Antigua and Barbuda)',
    description: 'National revenue authority — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-IMMIGRATION',
    name: 'Chief Immigration Officer (Antigua and Barbuda)',
    description: 'National immigration authority — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-POLICE',
    name: 'Commissioner of Police (Royal Police Force of Antigua and Barbuda)',
    description: 'National police authority — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-FSRC',
    name: 'Financial Services Regulatory Commission',
    description: 'National financial services regulator — advisory participation only.',
    type: ExternalAuthorityType.REGULATORY,
  },
  {
    code: 'AG-NATL-ADV-ONDCP',
    name: 'Office of National Drug and Money Laundering Control Policy',
    description: 'National AML/CFT competent authority — advisory participation only.',
    type: ExternalAuthorityType.REGULATORY,
  },
  {
    code: 'AG-NATL-ADV-ABIA',
    name: 'Antigua and Barbuda Investment Authority',
    description: 'National investment promotion body — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-DCA',
    name: 'Development Control Authority',
    description: 'National development control body — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-FIU',
    name: 'Financial Intelligence Unit (Antigua and Barbuda)',
    description: 'National FIU — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
  {
    code: 'AG-NATL-ADV-LABOUR',
    name: 'Labour Department (Antigua and Barbuda)',
    description: 'National labour authority — advisory participation only.',
    type: ExternalAuthorityType.GOVERNMENT,
  },
] as const;
