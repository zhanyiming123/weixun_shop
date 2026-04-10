import defaultSettings from '../settings.json';
import { CurrentOrganization, readCurrentOrganization } from '@/utils/organization';

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
  userLoading?: boolean;
}

const initialState: GlobalState = {
  settings: defaultSettings,
  userInfo: {
    permissions: {},
  },
  currentOrganization: readCurrentOrganization(),
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
    default:
      return state;
  }
}
