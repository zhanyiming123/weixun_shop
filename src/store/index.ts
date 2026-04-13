import defaultSettings from '../settings.json';
import { CurrentOrganization, readCurrentOrganization } from '@/utils/organization';
import {
  DemoContext,
  DemoIdentityId,
  DemoSystemId,
  buildDemoUserInfo,
  resolveDemoSelection,
} from '@/utils/demo';

export interface GlobalState {
  settings?: typeof defaultSettings;
  userInfo?: {
    name?: string;
    avatar?: string;
    job?: string;
    organization?: string;
    location?: string;
    email?: string;
    permissions: Record<string, string[]>;
  };
  currentOrganization?: CurrentOrganization;
  currentDemoSystem?: DemoSystemId;
  currentDemoIdentity?: DemoIdentityId;
  demoContext?: DemoContext;
  userLoading?: boolean;
}

const initialDemoSelection = resolveDemoSelection({
  currentOrganizationId: readCurrentOrganization().id,
});

const initialState: GlobalState = {
  settings: defaultSettings,
  userInfo: buildDemoUserInfo(
    initialDemoSelection.currentDemoIdentity,
    initialDemoSelection.currentOrganization
  ),
  currentOrganization: initialDemoSelection.currentOrganization,
  currentDemoSystem: initialDemoSelection.currentDemoSystem,
  currentDemoIdentity: initialDemoSelection.currentDemoIdentity,
  demoContext: initialDemoSelection.demoContext,
};

export default function store(state = initialState, action) {
  switch (action.type) {
    case 'update-settings': {
      const { settings } = action.payload;
      return {
        ...state,
        settings,
      };
    }
    case 'update-userInfo': {
      const { userInfo = initialState.userInfo, userLoading } = action.payload;
      return {
        ...state,
        userLoading,
        userInfo,
      };
    }
    case 'update-currentOrganization': {
      const { currentOrganization } = action.payload;
      return {
        ...state,
        currentOrganization,
      };
    }
    case 'update-demo-selection': {
      const {
        currentOrganization,
        currentDemoSystem,
        currentDemoIdentity,
        demoContext,
        userInfo,
      } = action.payload;
      return {
        ...state,
        currentOrganization,
        currentDemoSystem,
        currentDemoIdentity,
        demoContext,
        userInfo: userInfo || state.userInfo,
      };
    }
    default:
      return state;
  }
}
