import {
  CurrentOrganization,
  HEADQUARTER_ORGANIZATION_ID,
  OrganizationOption,
  buildCurrentOrganizationOptions,
  filterStoreItemsByIds,
  getCurrentOrganizationById,
  hasStoreIntersection,
} from '@/utils/organization';
import { ProductStoreItem, readProductStoreItems } from '@/pages/product/store-config/data';
import { readPersistentValue, writePersistentValue } from '@/utils/usePersistentState';
import { readDeptStoreAssignments } from '@/utils/data-scope';

export type DemoSystemId = 'merchant' | 'store';
export type DemoIdentityId = 'merchant_admin' | 'region_admin' | 'store_staff';
export type DemoDataScope = 'tenant_all' | 'region_all' | 'department_all';

export type DemoIdentityPreset = {
  id: DemoIdentityId;
  label: string;
  displayName: string;
  jobTitle: string;
  avatar: string;
  email: string;
  defaultSystemId: DemoSystemId;
  defaultOrganizationId: string;
  allowedOrganizationIds: string[];
  dataScope: DemoDataScope;
  description: string;
  currentStaffDepartmentName?: string;
  managedDepartmentId?: string;
};

export type DemoContext = {
  currentDemoSystem: DemoSystemId;
  currentDemoIdentity: DemoIdentityId;
  systemLabel: string;
  identityLabel: string;
  identityDescription: string;
  dataScope: DemoDataScope;
  dataScopeLabel: string;
  dataScopeDescription: string;
  allowedOrganizationIds: string[];
  allowedSystemIds: DemoSystemId[];
  organizationLocked: boolean;
  currentStaffDepartmentName?: string;
  defaultHomeRoute: string;
};

export type ResolvedDemoSelection = {
  currentDemoSystem: DemoSystemId;
  currentDemoIdentity: DemoIdentityId;
  currentOrganization: CurrentOrganization;
  demoContext: DemoContext;
};

const DEMO_SYSTEM_STORAGE_KEY = 'demo-system-id';
const DEMO_IDENTITY_STORAGE_KEY = 'demo-identity-id';
const CURRENT_ORGANIZATION_STORAGE_KEY = 'current-organization-id';

export const DEFAULT_DEMO_SYSTEM_ID: DemoSystemId = 'merchant';
export const DEFAULT_DEMO_IDENTITY_ID: DemoIdentityId = 'merchant_admin';

const DEFAULT_AVATAR =
  'https://lf1-xgcdn-tos.pstatp.com/obj/vcloud/vadmin/start.8e0e4855ee346a46ccff8ff3e24db27b.png';

export const DEMO_SYSTEM_LABEL_MAP: Record<DemoSystemId, string> = {
  merchant: '商户管理系统',
  store: '店铺管理系统',
};

export const DEMO_IDENTITY_PRESET_MAP: Record<DemoIdentityId, DemoIdentityPreset> = {
  merchant_admin: {
    id: 'merchant_admin',
    label: '商户管理员',
    displayName: '陈嘉禾',
    jobTitle: '商户管理员',
    avatar: DEFAULT_AVATAR,
    email: 'merchant.admin@weixun.demo',
    defaultSystemId: 'merchant',
    defaultOrganizationId: HEADQUARTER_ORGANIZATION_ID,
    allowedOrganizationIds: [HEADQUARTER_ORGANIZATION_ID],
    dataScope: 'tenant_all',
    description: '可查看全商户数据，负责组织架构、店铺、商户员工与商户角色配置。',
  },
  region_admin: {
    id: 'region_admin',
    label: '区域管理员',
    displayName: '林岚',
    jobTitle: '区域管理员',
    avatar: DEFAULT_AVATAR,
    email: 'region.admin@weixun.demo',
    defaultSystemId: 'merchant',
    defaultOrganizationId: 'org_partner_huanan_001',
    allowedOrganizationIds: [
      'org_partner_huanan_001',
      'org_store_guangzhou_001',
      'org_store_shenzhen_001',
    ],
    dataScope: 'region_all',
    description: '查看所辖区域和店铺数据，可创建店铺并配置店铺员工与店铺角色。',
  },
  store_staff: {
    id: 'store_staff',
    label: '店铺员工',
    displayName: '黄颖',
    jobTitle: '店铺员工',
    avatar: DEFAULT_AVATAR,
    email: 'store.staff@weixun.demo',
    defaultSystemId: 'store',
    defaultOrganizationId: 'org_store_guangzhou_001',
    allowedOrganizationIds: ['org_store_guangzhou_001'],
    dataScope: 'department_all',
    description: '负责店铺日常经营，看到的核心经营数据按当前部门全量口径投影。',
    currentStaffDepartmentName: '升学顾问部',
    managedDepartmentId: 'dept_guangzhou',
  },
};

export const DEMO_DATA_SCOPE_LABEL_MAP: Record<DemoDataScope, string> = {
  tenant_all: '租户全量',
  region_all: '区域全量',
  department_all: '部门全量',
};

export const DEMO_DATA_SCOPE_DESCRIPTION_MAP: Record<DemoDataScope, string> = {
  tenant_all: '当前演示身份可查看整个商户范围内的汇总与配置数据。',
  region_all: '当前演示身份只可查看所辖区域及其店铺的全部数据。',
  department_all: '当前演示身份只查看店铺内当前部门的全量经营数据。',
};

function normalizeDemoSystemId(value: unknown): DemoSystemId {
  return value === 'store' ? 'store' : 'merchant';
}

export function normalizeDemoIdentityId(value: unknown): DemoIdentityId {
  if (
    value === 'merchant_admin' ||
    value === 'region_admin' ||
    value === 'store_staff'
  ) {
    return value;
  }

  return DEFAULT_DEMO_IDENTITY_ID;
}

function stableHash(value: string) {
  return value.split('').reduce((sum, char, index) => {
    return sum + char.charCodeAt(0) * (index + 1);
  }, 0);
}

export function getDemoIdentityPreset(identityId: DemoIdentityId) {
  return DEMO_IDENTITY_PRESET_MAP[identityId];
}

export function getAllDemoIdentityPresets() {
  return Object.values(DEMO_IDENTITY_PRESET_MAP);
}

export function getAllowedOrganizationIds(
  identityId: DemoIdentityId,
  organizationOptions: OrganizationOption[] = buildCurrentOrganizationOptions()
) {
  const preset = getDemoIdentityPreset(identityId);
  const optionIdSet = new Set(organizationOptions.map((item) => item.id));

  if (identityId === 'merchant_admin') {
    return organizationOptions.map((item) => item.id);
  }

  const baseAllowed = preset.allowedOrganizationIds.filter((item) => optionIdSet.has(item));

  // Further restrict by department store assignment if the identity has a managed department
  if (preset.managedDepartmentId) {
    const assignments = readDeptStoreAssignments();
    const deptStoreIds = assignments[preset.managedDepartmentId];

    if (deptStoreIds && deptStoreIds.length > 0) {
      const filteredAllowed = organizationOptions
        .filter(
          (org) =>
            baseAllowed.includes(org.id) &&
            hasStoreIntersection(org.storeIds, deptStoreIds)
        )
        .map((org) => org.id);

      if (filteredAllowed.length > 0) {
        return filteredAllowed;
      }
    }
  }

  return baseAllowed;
}

export function getAllowedDemoSystemIds(
  identityId: DemoIdentityId,
  currentOrganization: CurrentOrganization
): DemoSystemId[] {
  if (identityId === 'merchant_admin') {
    return ['merchant'];
  }

  if (identityId === 'store_staff') {
    return ['store'];
  }

  return currentOrganization.scope === 'store' ? ['merchant', 'store'] : ['merchant'];
}

export function getAvailableDemoSystemIds(currentOrganization: CurrentOrganization) {
  return currentOrganization.scope === 'store' ? ['merchant', 'store'] : ['merchant'];
}

export function getAvailableDemoIdentityIds(
  currentDemoSystem: DemoSystemId,
  currentOrganization: CurrentOrganization,
  organizationOptions: OrganizationOption[] = buildCurrentOrganizationOptions()
) {
  const preferredOrder: DemoIdentityId[] =
    currentDemoSystem === 'merchant'
      ? ['merchant_admin', 'region_admin']
      : ['region_admin', 'store_staff'];

  return preferredOrder.filter((identityId) => {
    const allowedOrganizationIds = getAllowedOrganizationIds(
      identityId,
      organizationOptions
    );

    return (
      allowedOrganizationIds.includes(currentOrganization.id) &&
      getAllowedDemoSystemIds(identityId, currentOrganization).includes(currentDemoSystem)
    );
  });
}

export function getAvailableOrganizationsForSelection(
  currentDemoSystem: DemoSystemId,
  currentDemoIdentity: DemoIdentityId,
  organizationOptions: OrganizationOption[] = buildCurrentOrganizationOptions()
) {
  const allowedOrganizationIdSet = new Set(
    getAllowedOrganizationIds(currentDemoIdentity, organizationOptions)
  );

  return organizationOptions.filter((item) => {
    return (
      item.scope === 'store' &&
      allowedOrganizationIdSet.has(item.id) &&
      getAllowedDemoSystemIds(currentDemoIdentity, item).includes(currentDemoSystem)
    );
  });
}

export function getDemoOrganizationSelectionLabel(
  currentDemoSystem: DemoSystemId,
  currentDemoIdentity: DemoIdentityId,
  currentOrganization: CurrentOrganization | OrganizationOption
) {
  if (
    currentDemoSystem === 'store' &&
    currentDemoIdentity === 'region_admin' &&
    currentOrganization.scope === 'store'
  ) {
    return currentOrganization.name;
  }

  return 'label' in currentOrganization && currentOrganization.label
    ? currentOrganization.label
    : currentOrganization.name;
}

export function getDemoCurrentPresetTitle(
  currentDemoSystem: DemoSystemId,
  currentDemoIdentity: DemoIdentityId,
  currentOrganization: CurrentOrganization,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const preset = getDemoIdentityPreset(currentDemoIdentity);

  if (
    currentDemoSystem === 'store' &&
    currentDemoIdentity === 'region_admin' &&
    currentOrganization.scope === 'store'
  ) {
    const matchedStore = filterStoreItemsByIds(
      storeItems,
      currentOrganization.storeIds
    )[0];

    return matchedStore?.managerName
      ? `${matchedStore.managerName} Manager`
      : `${currentOrganization.name} Manager`;
  }

  return preset.label;
}

export function getDefaultDemoIdentityForSystem(
  currentDemoSystem: DemoSystemId
): DemoIdentityId {
  return currentDemoSystem === 'store' ? 'region_admin' : 'merchant_admin';
}

export function getPreferredDemoIdentityForSystem(
  currentDemoSystem: DemoSystemId,
  currentOrganization: CurrentOrganization,
  preferredIdentityId?: DemoIdentityId,
  organizationOptions: OrganizationOption[] = buildCurrentOrganizationOptions()
) {
  const availableIdentityIds = getAvailableDemoIdentityIds(
    currentDemoSystem,
    currentOrganization,
    organizationOptions
  );

  if (preferredIdentityId && availableIdentityIds.includes(preferredIdentityId)) {
    return preferredIdentityId;
  }

  return availableIdentityIds[0] || getDefaultDemoIdentityForSystem(currentDemoSystem);
}

function getDefaultOrganizationId(
  identityId: DemoIdentityId,
  organizationOptions: OrganizationOption[]
) {
  const preset = getDemoIdentityPreset(identityId);
  const allowedOrganizationIds = getAllowedOrganizationIds(identityId, organizationOptions);

  if (allowedOrganizationIds.includes(preset.defaultOrganizationId)) {
    return preset.defaultOrganizationId;
  }

  return allowedOrganizationIds[0] || HEADQUARTER_ORGANIZATION_ID;
}

function getCompatibleOrganizationIdForSelection(
  currentDemoSystem: DemoSystemId,
  currentDemoIdentity: DemoIdentityId,
  organizationOptions: OrganizationOption[],
  preferredOrganizationId?: string
) {
  const allowedOrganizationIdSet = new Set(
    getAllowedOrganizationIds(currentDemoIdentity, organizationOptions)
  );
  const compatibleOrganizations = organizationOptions.filter((item) => {
    return (
      allowedOrganizationIdSet.has(item.id) &&
      getAllowedDemoSystemIds(currentDemoIdentity, item).includes(currentDemoSystem)
    );
  });

  if (!compatibleOrganizations.length) {
    return getDefaultOrganizationId(currentDemoIdentity, organizationOptions);
  }

  if (
    preferredOrganizationId &&
    compatibleOrganizations.some((item) => item.id === preferredOrganizationId)
  ) {
    return preferredOrganizationId;
  }

  if (currentDemoSystem === 'store') {
    const matchedStoreOrganization = compatibleOrganizations.find(
      (item) => item.scope === 'store'
    );

    if (matchedStoreOrganization) {
      return matchedStoreOrganization.id;
    }
  }

  const preset = getDemoIdentityPreset(currentDemoIdentity);

  if (
    compatibleOrganizations.some((item) => item.id === preset.defaultOrganizationId)
  ) {
    return preset.defaultOrganizationId;
  }

  return compatibleOrganizations[0].id;
}

export function buildDemoContext(
  currentDemoSystem: DemoSystemId,
  currentDemoIdentity: DemoIdentityId,
  currentOrganization: CurrentOrganization,
  organizationOptions: OrganizationOption[] = buildCurrentOrganizationOptions()
): DemoContext {
  const preset = getDemoIdentityPreset(currentDemoIdentity);
  const allowedOrganizationIds = getAllowedOrganizationIds(
    currentDemoIdentity,
    organizationOptions
  );

  return {
    currentDemoSystem,
    currentDemoIdentity,
    systemLabel: DEMO_SYSTEM_LABEL_MAP[currentDemoSystem],
    identityLabel: preset.label,
    identityDescription: preset.description,
    dataScope: preset.dataScope,
    dataScopeLabel: DEMO_DATA_SCOPE_LABEL_MAP[preset.dataScope],
    dataScopeDescription: DEMO_DATA_SCOPE_DESCRIPTION_MAP[preset.dataScope],
    allowedOrganizationIds,
    allowedSystemIds: getAllowedDemoSystemIds(currentDemoIdentity, currentOrganization),
    organizationLocked: currentDemoIdentity === 'store_staff',
    currentStaffDepartmentName: preset.currentStaffDepartmentName,
    defaultHomeRoute: 'dashboard/workplace',
  };
}

export function resolveDemoSelection(params?: {
  currentDemoSystem?: DemoSystemId;
  currentDemoIdentity?: DemoIdentityId;
  currentOrganizationId?: string;
  organizationOptions?: OrganizationOption[];
}) {
  const organizationOptions =
    params?.organizationOptions || buildCurrentOrganizationOptions();

  let currentDemoIdentity = normalizeDemoIdentityId(
    params?.currentDemoIdentity || readCurrentDemoIdentityId()
  );
  let currentOrganization = getCurrentOrganizationById(
    params?.currentOrganizationId || readCurrentOrganizationIdFallback(),
    organizationOptions
  );
  let currentDemoSystem = normalizeDemoSystemId(
    params?.currentDemoSystem || readCurrentDemoSystemId()
  );

  if (
    !getAllowedOrganizationIds(currentDemoIdentity, organizationOptions).includes(
      currentOrganization.id
    )
  ) {
    currentOrganization = getCurrentOrganizationById(
      getDefaultOrganizationId(currentDemoIdentity, organizationOptions),
      organizationOptions
    );
  }

  currentOrganization = getCurrentOrganizationById(
    getCompatibleOrganizationIdForSelection(
      currentDemoSystem,
      currentDemoIdentity,
      organizationOptions,
      currentOrganization.id
    ),
    organizationOptions
  );

  if (
    !getAllowedDemoSystemIds(currentDemoIdentity, currentOrganization).includes(
      currentDemoSystem
    )
  ) {
    currentDemoIdentity = getPreferredDemoIdentityForSystem(
      currentDemoSystem,
      currentOrganization,
      currentDemoIdentity,
      organizationOptions
    );
  }

  currentOrganization = getCurrentOrganizationById(
    getCompatibleOrganizationIdForSelection(
      currentDemoSystem,
      currentDemoIdentity,
      organizationOptions,
      currentOrganization.id
    ),
    organizationOptions
  );

  if (
    !getAllowedDemoSystemIds(currentDemoIdentity, currentOrganization).includes(
      currentDemoSystem
    )
  ) {
    currentDemoSystem = getDemoIdentityPreset(currentDemoIdentity).defaultSystemId;
  }

  currentOrganization = getCurrentOrganizationById(
    getCompatibleOrganizationIdForSelection(
      currentDemoSystem,
      currentDemoIdentity,
      organizationOptions,
      currentOrganization.id
    ),
    organizationOptions
  );

  if (
    !getAllowedOrganizationIds(currentDemoIdentity, organizationOptions).includes(
      currentOrganization.id
    )
  ) {
    currentOrganization = getCurrentOrganizationById(
      getDefaultOrganizationId(currentDemoIdentity, organizationOptions),
      organizationOptions
    );
  }

  return {
    currentDemoSystem,
    currentDemoIdentity,
    currentOrganization,
    demoContext: buildDemoContext(
      currentDemoSystem,
      currentDemoIdentity,
      currentOrganization,
      organizationOptions
    ),
  } as ResolvedDemoSelection;
}

function readCurrentOrganizationIdFallback() {
  return readPersistentValue(
    CURRENT_ORGANIZATION_STORAGE_KEY,
    HEADQUARTER_ORGANIZATION_ID
  );
}

export function readCurrentDemoSystemId() {
  return readPersistentValue<DemoSystemId>(
    DEMO_SYSTEM_STORAGE_KEY,
    DEFAULT_DEMO_SYSTEM_ID
  );
}

export function writeCurrentDemoSystemId(value: DemoSystemId) {
  writePersistentValue(DEMO_SYSTEM_STORAGE_KEY, value);
}

export function readCurrentDemoIdentityId() {
  return readPersistentValue<DemoIdentityId>(
    DEMO_IDENTITY_STORAGE_KEY,
    DEFAULT_DEMO_IDENTITY_ID
  );
}

export function writeCurrentDemoIdentityId(value: DemoIdentityId) {
  writePersistentValue(DEMO_IDENTITY_STORAGE_KEY, value);
}

export function persistDemoSelection(selection: ResolvedDemoSelection) {
  writeCurrentDemoSystemId(selection.currentDemoSystem);
  writeCurrentDemoIdentityId(selection.currentDemoIdentity);
}

export function buildDemoUserInfo(
  currentDemoIdentity: DemoIdentityId,
  currentOrganization: CurrentOrganization
) {
  const preset = getDemoIdentityPreset(currentDemoIdentity);

  return {
    name: preset.displayName,
    avatar: preset.avatar,
    job: preset.jobTitle,
    organization: currentOrganization.name,
    email: preset.email,
    permissions: {},
  };
}

export function filterItemsByDepartmentScope<T>(
  items: T[],
  demoContext:
    | Pick<DemoContext, 'currentDemoIdentity'>
    | {
        currentDemoIdentity?: DemoIdentityId;
      }
    | undefined,
  getKey: (item: T) => string
) {
  if (demoContext?.currentDemoIdentity !== 'store_staff') {
    return items;
  }

  return items.filter((item) => stableHash(getKey(item)) % 100 < 62);
}

export function scaleMetricByDemoScope(
  value: number,
  demoContext:
    | Pick<DemoContext, 'currentDemoIdentity'>
    | {
        currentDemoIdentity?: DemoIdentityId;
      }
    | undefined
) {
  if (demoContext?.currentDemoIdentity !== 'store_staff') {
    return value;
  }

  return Math.max(1, Math.round(value * 0.62));
}
