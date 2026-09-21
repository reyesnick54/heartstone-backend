import { Injectable } from '@nestjs/common';

import {
  PlatformAdminAvailableActionDto,
  PlatformAdminAvailableActionsResponseDto,
} from '../dto/platform-admin-response.dto';
import {
  PLATFORM_ADMIN_ACTION_KEYS,
  PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
  PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
} from '../platform-admin.constants';
import { type ResolvedPlatformAdminContext } from '../types/platform-admin-context.types';

@Injectable()
export class PlatformAdminAvailableActionsService {
  buildAvailableActions(
    context: ResolvedPlatformAdminContext,
  ): PlatformAdminAvailableActionsResponseDto {
    const actions: PlatformAdminAvailableActionDto[] = [];

    if (context.policy.canConfigureServices) {
      actions.push(
        {
          actionKey: PLATFORM_ADMIN_ACTION_KEYS.CONFIGURE_SERVICE,
          label: 'Configure service',
          description: 'Open governed service configuration workflow',
          isConsequential: false,
          executionRoute: '/service-catalog/government-services',
          requiresGovernedWorkflow: true,
        },
        {
          actionKey: PLATFORM_ADMIN_ACTION_KEYS.CREATE_DRAFT_SERVICE_VERSION,
          label: 'Create draft service version',
          description: 'Create a new draft version without activating production service',
          isConsequential: false,
          executionRoute: '/service-catalog/government-service-versions',
          requiresGovernedWorkflow: true,
        },
        {
          actionKey: PLATFORM_ADMIN_ACTION_KEYS.SUBMIT_SERVICE_FOR_ACCEPTANCE,
          label: 'Submit service for acceptance',
          description: 'Submit configured service version for institutional acceptance review',
          isConsequential: true,
          executionRoute: '/service-catalog/activation-governance/submit-for-acceptance',
          requiresGovernedWorkflow: true,
        },
        {
          actionKey: PLATFORM_ADMIN_ACTION_KEYS.REQUEST_ACTIVATION,
          label: 'Request activation',
          description: 'Request operational activation through readiness and authority gates',
          isConsequential: true,
          executionRoute: '/service-catalog/activation-governance/request-activation',
          requiresGovernedWorkflow: true,
        },
        {
          actionKey: PLATFORM_ADMIN_ACTION_KEYS.SUSPEND_CONFIGURATION,
          label: 'Suspend configuration',
          description:
            'Suspend service configuration where existing governance supports suspension',
          isConsequential: true,
          executionRoute: '/service-catalog/activation-governance/suspend',
          requiresGovernedWorkflow: true,
        },
      );
    }

    if (context.policy.canConfigureForms) {
      actions.push({
        actionKey: PLATFORM_ADMIN_ACTION_KEYS.CONFIGURE_FORM,
        label: 'Configure form',
        description: 'Configure form definitions through governed form lifecycle',
        isConsequential: false,
        executionRoute: '/service-catalog/forms',
        requiresGovernedWorkflow: true,
      });
    }

    if (context.policy.canConfigureWorkflows) {
      actions.push({
        actionKey: PLATFORM_ADMIN_ACTION_KEYS.CONFIGURE_WORKFLOW,
        label: 'Configure workflow',
        description: 'Configure workflow definitions requiring validation before approval',
        isConsequential: false,
        executionRoute: '/application-processing/workflow-definitions',
        requiresGovernedWorkflow: true,
      });
    }

    if (context.policy.canConfigureIntegrations) {
      actions.push({
        actionKey: PLATFORM_ADMIN_ACTION_KEYS.REGISTER_INTEGRATION,
        label: 'Register integration',
        description: 'Register integration definition pending acceptance and activation',
        isConsequential: false,
        executionRoute: '/operational-support/integrations',
        requiresGovernedWorkflow: true,
      });
    }

    if (context.policy.canConfigureCommunications) {
      actions.push({
        actionKey: PLATFORM_ADMIN_ACTION_KEYS.CONFIGURE_COMMUNICATIONS_TEMPLATE,
        label: 'Configure communications template',
        description: 'Configure institution communication templates',
        isConsequential: false,
        executionRoute: '/operational-support/communication-templates',
        requiresGovernedWorkflow: true,
      });
    }

    return {
      actions,
      hasSubstantiveGovernmentAuthority: false,
      authorityDisclaimer: PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
      configurationDisclaimer: PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
    };
  }
}
