import {
  EnterpriseDepartmentItem,
  readEnterpriseDepartmentItems,
} from '@/pages/enterprise/department/data';
import {
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP,
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP,
  EnterpriseRoleDataViewScope,
  EnterpriseRoleItem,
  getEnterpriseRolePermissionTitles,
  readEnterpriseRoleItems,
} from '@/pages/enterprise/role/data';
import {
  buildStoreReferencedEmployees,
  readStoreOrgReferenceConfigs,
  StoreOrgReferenceConfig,
  StoreOrgReferenceSubordinateRelation,
  StoreReferencedEmployeeItem,
  writeStoreOrgReferenceConfigs,
} from '@/pages/store-config/org-reference/data';
import {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type StoreEmployeePermissionConfigItem = {
  storeId: string;
  employeeId: string;
  roleIds: string[];
  manualIncludedEmployeeIds: string[];
  manualExcludedEmployeeIds: string[];
  updatedAt: string;
};

export type StoreManagedEmployeeItem = StoreReferencedEmployeeItem & {
  roleIds: string[];
  roleNames: string[];
  manualIncludedEmployeeIds: string[];
  manualExcludedEmployeeIds: string[];
  autoVisibleEmployeeIds: string[];
  autoVisibleEmployeeNames: string[];
  effectiveVisibleEmployeeIds: string[];
  effectiveVisibleEmployeeNames: string[];
};

export type StoreExternalEmployeeItem = {
  id: string;
  storeId: string;
  name: string;
  account: string;
  contactPhone: string;
  status: 'enabled' | 'disabled';
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreExternalEmployeePayload = {
  storeId: string;
  name: string;
  account: string;
  contactPhone: string;
  status?: 'enabled' | 'disabled';
};

export type StoreEmployeePermissionTreeNode = {
  key: string;
  title: string;
  disableCheckbox?: boolean;
  disabled?: boolean;
  children?: StoreEmployeePermissionTreeNode[];
};

type StoreEmployeePermissionConfigLike = Partial<StoreEmployeePermissionConfigItem> & {
  roleId?: unknown;
  roleIds?: unknown;
  customVisibleEmployeeIds?: unknown;
  manualIncludedEmployeeIds?: unknown;
  manualExcludedEmployeeIds?: unknown;
};

type StoreExternalEmployeeItemLike = Partial<StoreExternalEmployeeItem> & {
  status?: unknown;
};

const STORAGE_KEY = 'store-employee-configs-v1';
const EXTERNAL_EMPLOYEE_STORAGE_KEY = 'store-external-employee-items-v1';

const DEFAULT_STORE_EXTERNAL_EMPLOYEE_ITEMS: StoreExternalEmployeeItem[] = [
  {
    id: 'store_external_suzhou_001',
    storeId: 'org_store_suzhou_001',
    name: '方晓彤',
    account: 'fang.xiaotong',
    contactPhone: '13812340001',
    status: 'enabled',
    createdAt: '2026-01-15 09:30:00',
    updatedAt: '2026-01-15 09:30:00',
  },
  {
    id: 'store_external_suzhou_002',
    storeId: 'org_store_suzhou_001',
    name: '叶浩然',
    account: 'ye.haoran',
    contactPhone: '13812340002',
    status: 'enabled',
    createdAt: '2026-01-20 10:00:00',
    updatedAt: '2026-01-20 10:00:00',
  },
  {
    id: 'store_external_suzhou_003',
    storeId: 'org_store_suzhou_001',
    name: '江思远',
    account: 'jiang.siyuan',
    contactPhone: '13812340003',
    status: 'disabled',
    createdAt: '2026-02-05 11:15:00',
    updatedAt: '2026-03-10 14:20:00',
  },
  {
    id: 'store_external_guangzhou_001',
    storeId: 'org_store_guangzhou_001',
    name: '蔡雨桐',
    account: 'cai.yutong',
    contactPhone: '13912340001',
    status: 'enabled',
    createdAt: '2026-01-18 09:00:00',
    updatedAt: '2026-01-18 09:00:00',
  },
  {
    id: 'store_external_guangzhou_002',
    storeId: 'org_store_guangzhou_001',
    name: '潘子衿',
    account: 'pan.zijin',
    contactPhone: '13912340002',
    status: 'enabled',
    createdAt: '2026-02-10 10:30:00',
    updatedAt: '2026-02-10 10:30:00',
  },
  {
    id: 'store_external_guangzhou_003',
    storeId: 'org_store_guangzhou_001',
    name: '贺明宇',
    account: 'he.mingyu',
    contactPhone: '13912340003',
    status: 'enabled',
    createdAt: '2026-02-20 15:00:00',
    updatedAt: '2026-02-20 15:00:00',
  },
  {
    id: 'store_external_guangzhou_004',
    storeId: 'org_store_guangzhou_001',
    name: '秦若溪',
    account: 'qin.ruoxi',
    contactPhone: '13912340004',
    status: 'disabled',
    createdAt: '2026-03-01 08:45:00',
    updatedAt: '2026-04-01 09:00:00',
  },
  {
    id: 'store_external_shenzhen_001',
    storeId: 'org_store_shenzhen_001',
    name: '魏晨阳',
    account: 'wei.chenyang',
    contactPhone: '13612340001',
    status: 'enabled',
    createdAt: '2026-01-22 09:00:00',
    updatedAt: '2026-01-22 09:00:00',
  },
  {
    id: 'store_external_shenzhen_002',
    storeId: 'org_store_shenzhen_001',
    name: '林舒宁',
    account: 'lin.shuning',
    contactPhone: '13612340002',
    status: 'enabled',
    createdAt: '2026-02-14 10:00:00',
    updatedAt: '2026-02-14 10:00:00',
  },
  {
    id: 'store_external_shenzhen_003',
    storeId: 'org_store_shenzhen_001',
    name: '陈逸飞',
    account: 'chen.yifei',
    contactPhone: '13612340003',
    status: 'enabled',
    createdAt: '2026-03-05 11:00:00',
    updatedAt: '2026-03-05 11:00:00',
  },
];
const STORE_ROLE_DATA_VIEW_SCOPE_PRIORITY: Record<
  EnterpriseRoleDataViewScope,
  number
> = {
  self: 0,
  custom_employee: 1,
  department: 2,
  all: 3,
};

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\//g, '-');
}

function normalizeStringArray(value: unknown) {
  return Array.from(
    new Set(
      Array.isArray(value)
        ? value.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0
          )
        : []
    )
  );
}

function createStoreExternalEmployeeId() {
  return `store_external_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function sortStoreExternalEmployeeItems(items: StoreExternalEmployeeItem[]) {
  return [...items].sort((left, right) => {
    const storeCompare = left.storeId.localeCompare(right.storeId, 'zh-CN');

    if (storeCompare !== 0) {
      return storeCompare;
    }

    const nameCompare = left.name.localeCompare(right.name, 'zh-CN');
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return left.id.localeCompare(right.id, 'zh-CN');
  });
}

function normalizeStoreExternalEmployeeItem(
  item: StoreExternalEmployeeItemLike
): StoreExternalEmployeeItem | null {
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const storeId = typeof item.storeId === 'string' ? item.storeId.trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const account = typeof item.account === 'string' ? item.account.trim() : '';
  const contactPhone =
    typeof item.contactPhone === 'string' ? item.contactPhone.trim() : '';

  if (!id || !storeId || !name || !account || !contactPhone) {
    return null;
  }

  const status = item.status === 'disabled' ? 'disabled' : 'enabled';

  return {
    id,
    storeId,
    name,
    account,
    contactPhone,
    status,
    createdAt:
      typeof item.createdAt === 'string' && item.createdAt
        ? item.createdAt
        : formatDateTime(),
    updatedAt:
      typeof item.updatedAt === 'string' && item.updatedAt
        ? item.updatedAt
        : formatDateTime(),
  };
}

export function readStoreExternalEmployeeItems(storeId?: string) {
  const raw = readPersistentValue<StoreExternalEmployeeItemLike[] | null>(
    EXTERNAL_EMPLOYEE_STORAGE_KEY,
    null
  );
  const persistedItems: StoreExternalEmployeeItemLike[] = Array.isArray(raw)
    ? raw
    : DEFAULT_STORE_EXTERNAL_EMPLOYEE_ITEMS;
  const normalizedItems = sortStoreExternalEmployeeItems(
    persistedItems
      .filter(
        (item): item is StoreExternalEmployeeItemLike =>
          Boolean(item) && typeof item === 'object'
      )
      .map((item) => normalizeStoreExternalEmployeeItem(item))
      .filter((item): item is StoreExternalEmployeeItem => Boolean(item))
  );

  if (JSON.stringify(persistedItems) !== JSON.stringify(normalizedItems)) {
    writePersistentValue(EXTERNAL_EMPLOYEE_STORAGE_KEY, normalizedItems);
  }

  if (!storeId) {
    return normalizedItems;
  }

  return normalizedItems.filter((item) => item.storeId === storeId);
}

export function writeStoreExternalEmployeeItems(items: StoreExternalEmployeeItem[]) {
  writePersistentValue(
    EXTERNAL_EMPLOYEE_STORAGE_KEY,
    sortStoreExternalEmployeeItems(items)
  );
}

export function createStoreExternalEmployee(
  payload: CreateStoreExternalEmployeePayload,
  items: StoreExternalEmployeeItem[] = readStoreExternalEmployeeItems()
) {
  const nextItem: StoreExternalEmployeeItem = {
    id: createStoreExternalEmployeeId(),
    storeId: payload.storeId,
    name: payload.name.trim(),
    account: payload.account.trim(),
    contactPhone: payload.contactPhone.trim(),
    status: payload.status === 'disabled' ? 'disabled' : 'enabled',
    createdAt: formatDateTime(),
    updatedAt: formatDateTime(),
  };
  const nextItems = sortStoreExternalEmployeeItems([...items, nextItem]);

  writeStoreExternalEmployeeItems(nextItems);

  return {
    item: nextItem,
    items: nextItems,
  };
}

export function buildStoreExternalReferencedEmployees(
  storeId: string,
  externalEmployees: StoreExternalEmployeeItem[] = readStoreExternalEmployeeItems(storeId)
) {
  return externalEmployees
    .filter((item) => item.storeId === storeId)
    .map<StoreReferencedEmployeeItem>((item) => ({
      id: item.id,
      name: item.name,
      account: item.account,
      contactPhone: item.contactPhone,
      isManagement: false,
      status: item.status,
      sourceType: 'external_import',
      sourceDepartmentPath: ['外部导入'],
      readonly: true,
      ownerEmployeeIds: [],
      ownerEmployeeNames: [],
    }));
}

export function buildStoreEmployeeSourceEmployees(
  storeId: string,
  referencedEmployees: StoreReferencedEmployeeItem[] = buildStoreReferencedEmployees(storeId),
  externalEmployees: StoreExternalEmployeeItem[] = readStoreExternalEmployeeItems(storeId)
) {
  const externalReferencedEmployees = buildStoreExternalReferencedEmployees(
    storeId,
    externalEmployees
  );
  const seenEmployeeIds = new Set<string>();

  return [...referencedEmployees, ...externalReferencedEmployees].filter((item) => {
    if (seenEmployeeIds.has(item.id)) {
      return false;
    }

    seenEmployeeIds.add(item.id);
    return true;
  });
}

function buildStoreRoleItems(roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems()) {
  return roleItems.filter((item) => item.scope === 'store');
}

export function getDefaultStoreEmployeeRoleIds(
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems()
) {
  const storeRoles = buildStoreRoleItems(roleItems);
  const staffRole = storeRoles.find((item) => item.id === 'role_store_staff');

  if (staffRole) {
    return [staffRole.id];
  }

  const defaultRole = storeRoles.find((item) => item.isDefault) || storeRoles[0];
  return defaultRole ? [defaultRole.id] : [];
}

function isPathPrefix(prefix: string[], path: string[]) {
  return (
    prefix.length <= path.length &&
    prefix.every((segment, index) => path[index] === segment)
  );
}

function collectAutoVisibleEmployeeIds(
  employeeId: string,
  referencedEmployees: StoreReferencedEmployeeItem[]
) {
  const currentEmployee = referencedEmployees.find((item) => item.id === employeeId);

  if (!currentEmployee?.isManagement) {
    return [];
  }

  return referencedEmployees
    .filter(
      (item) =>
        item.id !== currentEmployee.id &&
        isPathPrefix(currentEmployee.sourceDepartmentPath, item.sourceDepartmentPath)
    )
    .map((item) => item.id);
}

export function mergeAutoAndManualVisibleEmployeeIds(
  autoVisibleEmployeeIds: string[],
  manualIncludedEmployeeIds: string[],
  manualExcludedEmployeeIds: string[]
) {
  const visibleSet = new Set(autoVisibleEmployeeIds);

  manualIncludedEmployeeIds.forEach((employeeId) => visibleSet.add(employeeId));
  manualExcludedEmployeeIds.forEach((employeeId) => visibleSet.delete(employeeId));

  return Array.from(visibleSet);
}

function normalizeStoreEmployeePermissionConfig(
  item: StoreEmployeePermissionConfigLike,
  referencedEmployees: StoreReferencedEmployeeItem[] = [],
  validRoleIdSet = new Set<string>()
): StoreEmployeePermissionConfigItem | null {
  const storeId = typeof item.storeId === 'string' ? item.storeId : '';
  const employeeId = typeof item.employeeId === 'string' ? item.employeeId : '';
  const validEmployeeIdSet = new Set(referencedEmployees.map((employee) => employee.id));

  if (!storeId || !employeeId || !validEmployeeIdSet.has(employeeId)) {
    return null;
  }

  const roleIds = normalizeStringArray(item.roleIds).filter((roleId) =>
    validRoleIdSet.has(roleId)
  );
  const legacyRoleId =
    typeof item.roleId === 'string' && validRoleIdSet.has(item.roleId)
      ? item.roleId
      : undefined;
  const autoVisibleEmployeeIds = collectAutoVisibleEmployeeIds(
    employeeId,
    referencedEmployees
  );
  const hasManualOverrides =
    'manualIncludedEmployeeIds' in item || 'manualExcludedEmployeeIds' in item;
  const legacyVisibleEmployeeIds = normalizeStringArray(item.customVisibleEmployeeIds).filter(
    (targetEmployeeId) =>
      targetEmployeeId !== employeeId && validEmployeeIdSet.has(targetEmployeeId)
  );
  const autoVisibleEmployeeIdSet = new Set(autoVisibleEmployeeIds);
  const manualIncludedEmployeeIds = (
    hasManualOverrides
      ? normalizeStringArray(item.manualIncludedEmployeeIds)
      : legacyVisibleEmployeeIds.filter(
          (targetEmployeeId) => !autoVisibleEmployeeIdSet.has(targetEmployeeId)
        )
  ).filter(
    (targetEmployeeId) =>
      targetEmployeeId !== employeeId && validEmployeeIdSet.has(targetEmployeeId)
  );
  const legacyVisibleEmployeeIdSet = new Set(legacyVisibleEmployeeIds);
  const manualExcludedEmployeeIds = (
    hasManualOverrides
      ? normalizeStringArray(item.manualExcludedEmployeeIds)
      : autoVisibleEmployeeIds.filter(
          (targetEmployeeId) => !legacyVisibleEmployeeIdSet.has(targetEmployeeId)
        )
  ).filter(
    (targetEmployeeId) =>
      targetEmployeeId !== employeeId && validEmployeeIdSet.has(targetEmployeeId)
  );

  return {
    storeId,
    employeeId,
    roleIds: roleIds.length ? roleIds : legacyRoleId ? [legacyRoleId] : [],
    manualIncludedEmployeeIds,
    manualExcludedEmployeeIds,
    updatedAt:
      typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : formatDateTime(),
  };
}

function collectReferencedEmployeesByStore(
  orgConfigs: StoreOrgReferenceConfig[] = readStoreOrgReferenceConfigs(),
  externalEmployees: StoreExternalEmployeeItem[] = readStoreExternalEmployeeItems()
) {
  const externalEmployeeMap = new Map<string, StoreExternalEmployeeItem[]>();
  const orgConfigMap = new Map(orgConfigs.map((config) => [config.storeId, config]));
  const storeEmployeesMap = new Map<string, StoreReferencedEmployeeItem[]>();
  const storeIdSet = new Set([
    ...orgConfigs.map((config) => config.storeId),
    ...externalEmployees.map((item) => item.storeId),
  ]);

  externalEmployees.forEach((item) => {
    const currentItems = externalEmployeeMap.get(item.storeId) || [];
    currentItems.push(item);
    externalEmployeeMap.set(item.storeId, currentItems);
  });

  storeIdSet.forEach((storeId) => {
    const referencedEmployees = buildStoreReferencedEmployees(
      storeId,
      orgConfigMap.get(storeId)
    );
    const mergedEmployees = buildStoreEmployeeSourceEmployees(
      storeId,
      referencedEmployees,
      externalEmployeeMap.get(storeId) || []
    );

    storeEmployeesMap.set(storeId, mergedEmployees);
  });

  return storeEmployeesMap;
}

function createLegacyConfigMap(
  storeId: string,
  subordinateRelations: StoreOrgReferenceSubordinateRelation[],
  validEmployeeIdSet: Set<string>
) {
  const visibleMap = new Map<string, string[]>();

  subordinateRelations.forEach((item) => {
    if (
      !validEmployeeIdSet.has(item.subjectEmployeeId) ||
      !validEmployeeIdSet.has(item.ownerEmployeeId) ||
      item.subjectEmployeeId === item.ownerEmployeeId
    ) {
      return;
    }

    const currentVisibleIds = visibleMap.get(item.ownerEmployeeId) || [];
    currentVisibleIds.push(item.subjectEmployeeId);
    visibleMap.set(item.ownerEmployeeId, currentVisibleIds);
  });

  return Array.from(visibleMap.entries()).map<StoreEmployeePermissionConfigLike>(
    ([employeeId, customVisibleEmployeeIds]) => ({
      storeId,
      employeeId,
      roleIds: [],
      customVisibleEmployeeIds: normalizeStringArray(customVisibleEmployeeIds),
      updatedAt: formatDateTime(),
    })
  );
}

function sortStoreEmployeePermissionConfigs(items: StoreEmployeePermissionConfigItem[]) {
  return [...items].sort((left, right) => {
    const storeCompare = left.storeId.localeCompare(right.storeId, 'zh-CN');

    if (storeCompare !== 0) {
      return storeCompare;
    }

    return left.employeeId.localeCompare(right.employeeId, 'zh-CN');
  });
}

function readAndMigrateStoreEmployeePermissionConfigs() {
  const orgConfigs = readStoreOrgReferenceConfigs();
  const referencedEmployeesByStore = collectReferencedEmployeesByStore(orgConfigs);
  const validRoleIdSet = new Set(buildStoreRoleItems().map((item) => item.id));
  const persistedItems = readPersistentValue<StoreEmployeePermissionConfigLike[]>(
    STORAGE_KEY,
    []
  );
  const normalizedItems = persistedItems
    .filter(
      (item): item is StoreEmployeePermissionConfigLike =>
        Boolean(item) && typeof item === 'object'
    )
    .map((item) =>
      normalizeStoreEmployeePermissionConfig(
        item,
        referencedEmployeesByStore.get(item.storeId || '') || [],
        validRoleIdSet
      )
    )
    .filter((item): item is StoreEmployeePermissionConfigItem => Boolean(item));

  const existingConfigKeySet = new Set(
    normalizedItems.map((item) => `${item.storeId}:${item.employeeId}`)
  );
  const migratedItems = [...normalizedItems];
  let migratedLegacyRelations = false;

  const nextOrgConfigs = orgConfigs.map((config) => {
    if (!config.subordinateRelations.length) {
      return config;
    }

    const referencedEmployees = referencedEmployeesByStore.get(config.storeId) || [];
    const validEmployeeIdSet = new Set(referencedEmployees.map((item) => item.id));

    createLegacyConfigMap(
      config.storeId,
      config.subordinateRelations,
      validEmployeeIdSet
    ).forEach((legacyItem) => {
      const configKey = `${legacyItem.storeId}:${legacyItem.employeeId}`;

      if (existingConfigKeySet.has(configKey)) {
        return;
      }

      const normalizedItem = normalizeStoreEmployeePermissionConfig(
        legacyItem,
        referencedEmployees,
        validRoleIdSet
      );

      if (!normalizedItem) {
        return;
      }

      migratedItems.push(normalizedItem);
      existingConfigKeySet.add(configKey);
    });

    migratedLegacyRelations = true;
    return {
      ...config,
      subordinateRelations: [],
    };
  });

  const nextItems = sortStoreEmployeePermissionConfigs(
    migratedItems.filter((item): item is StoreEmployeePermissionConfigItem => Boolean(item))
  );

  if (JSON.stringify(persistedItems) !== JSON.stringify(nextItems)) {
    writePersistentValue(STORAGE_KEY, nextItems);
  }

  if (migratedLegacyRelations) {
    writeStoreOrgReferenceConfigs(nextOrgConfigs);
  }

  return nextItems;
}

export function readStoreEmployeePermissionConfigItems() {
  return readAndMigrateStoreEmployeePermissionConfigs();
}

export function writeStoreEmployeePermissionConfigItems(
  items: StoreEmployeePermissionConfigItem[]
) {
  writePersistentValue(STORAGE_KEY, sortStoreEmployeePermissionConfigs(items));
}

export function getStoreEmployeePermissionConfigByEmployeeId(
  storeId: string,
  employeeId: string,
  items: StoreEmployeePermissionConfigItem[] = readStoreEmployeePermissionConfigItems()
) {
  return items.find(
    (item) => item.storeId === storeId && item.employeeId === employeeId
  );
}

export function cleanupStoreEmployeePermissionConfigs(
  storeId: string,
  referencedEmployees: StoreReferencedEmployeeItem[],
  items: StoreEmployeePermissionConfigItem[] = readStoreEmployeePermissionConfigItems(),
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  const mergedReferencedEmployees = buildStoreEmployeeSourceEmployees(
    storeId,
    referencedEmployees
  );
  const validRoleIdSet = new Set(buildStoreRoleItems(roleItems).map((item) => item.id));
  const nextItems = sortStoreEmployeePermissionConfigs(
    items
      .flatMap((item) => {
        if (item.storeId !== storeId) {
          return [item];
        }

        const normalizedItem = normalizeStoreEmployeePermissionConfig(
          item,
          mergedReferencedEmployees,
          validRoleIdSet
        );

        return normalizedItem ? [normalizedItem] : [];
      })
      .filter((item) => item.storeId || item.employeeId)
  );

  if (JSON.stringify(items) !== JSON.stringify(nextItems)) {
    writeStoreEmployeePermissionConfigItems(nextItems);
  }

  return nextItems;
}

export function upsertStoreEmployeePermissionConfig(
  nextItem: Omit<StoreEmployeePermissionConfigItem, 'updatedAt'> & {
    updatedAt?: string;
  },
  items: StoreEmployeePermissionConfigItem[] = readStoreEmployeePermissionConfigItems(),
  referencedEmployees: StoreReferencedEmployeeItem[] = buildStoreEmployeeSourceEmployees(
    nextItem.storeId
  ),
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  const validRoleIdSet = new Set(buildStoreRoleItems(roleItems).map((item) => item.id));
  const sanitizedItem = normalizeStoreEmployeePermissionConfig(
    {
      ...nextItem,
      updatedAt: formatDateTime(),
    },
    referencedEmployees,
    validRoleIdSet
  );

  if (!sanitizedItem) {
    return items;
  }

  const nextItems = sortStoreEmployeePermissionConfigs(
    items.some(
      (item) =>
        item.storeId === sanitizedItem.storeId &&
        item.employeeId === sanitizedItem.employeeId
    )
      ? items.map((item) =>
          item.storeId === sanitizedItem.storeId &&
          item.employeeId === sanitizedItem.employeeId
            ? sanitizedItem
            : item
        )
      : [...items, sanitizedItem]
  );

  writeStoreEmployeePermissionConfigItems(nextItems);
  return nextItems;
}

function buildEmployeeNameMap(employees: StoreReferencedEmployeeItem[]) {
  return new Map(employees.map((item) => [item.id, item.name] as const));
}

export function buildStoreManagedEmployees(
  storeId: string,
  referencedEmployees: StoreReferencedEmployeeItem[] = buildStoreReferencedEmployees(storeId),
  configItems: StoreEmployeePermissionConfigItem[] = readStoreEmployeePermissionConfigItems(),
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems(),
  externalEmployees: StoreExternalEmployeeItem[] = readStoreExternalEmployeeItems(storeId)
) {
  const mergedReferencedEmployees = buildStoreEmployeeSourceEmployees(
    storeId,
    referencedEmployees,
    externalEmployees
  );
  const normalizedConfigItems = cleanupStoreEmployeePermissionConfigs(
    storeId,
    mergedReferencedEmployees,
    configItems,
    roleItems,
    departmentItems
  );
  const roleNameMap = new Map(
    buildStoreRoleItems(roleItems).map((item) => [item.id, item.name] as const)
  );
  const defaultRoleIds = getDefaultStoreEmployeeRoleIds(roleItems);
  const employeeNameMap = buildEmployeeNameMap(mergedReferencedEmployees);
  const configMap = new Map(
    normalizedConfigItems
      .filter((item) => item.storeId === storeId)
      .map((item) => [item.employeeId, item] as const)
  );

  return mergedReferencedEmployees.map<StoreManagedEmployeeItem>((employee) => {
    const config = configMap.get(employee.id);
    const roleIds = config?.roleIds?.length ? config.roleIds : defaultRoleIds;
    const manualIncludedEmployeeIds = config?.manualIncludedEmployeeIds || [];
    const manualExcludedEmployeeIds = config?.manualExcludedEmployeeIds || [];
    const autoVisibleEmployeeIds = collectAutoVisibleEmployeeIds(
      employee.id,
      mergedReferencedEmployees
    );
    const effectiveVisibleEmployeeIds = mergeAutoAndManualVisibleEmployeeIds(
      autoVisibleEmployeeIds,
      manualIncludedEmployeeIds,
      manualExcludedEmployeeIds
    );

    return {
      ...employee,
      roleIds,
      roleNames: roleIds
        .map((roleId) => roleNameMap.get(roleId))
        .filter((roleName): roleName is string => Boolean(roleName)),
      manualIncludedEmployeeIds,
      manualExcludedEmployeeIds,
      autoVisibleEmployeeIds,
      autoVisibleEmployeeNames: autoVisibleEmployeeIds
        .map((targetEmployeeId) => employeeNameMap.get(targetEmployeeId))
        .filter((item): item is string => Boolean(item)),
      effectiveVisibleEmployeeIds,
      effectiveVisibleEmployeeNames: effectiveVisibleEmployeeIds
        .map((targetEmployeeId) => employeeNameMap.get(targetEmployeeId))
        .filter((item): item is string => Boolean(item)),
    };
  });
}

export function buildStoreEmployeePermissionTree(
  employees: StoreManagedEmployeeItem[],
  currentEmployeeId: string
) {
  const rootNodes: StoreEmployeePermissionTreeNode[] = [];

  employees.forEach((employee) => {
    let currentLevel = rootNodes;
    const pathSegments = employee.sourceDepartmentPath.length
      ? employee.sourceDepartmentPath
      : ['未分组'];
    const pathAccumulator: string[] = [];

    pathSegments.forEach((segment) => {
      pathAccumulator.push(segment);
      const nodeKey = `path:${pathAccumulator.join('/')}`;
      let targetNode = currentLevel.find((item) => item.key === nodeKey);

      if (!targetNode) {
        targetNode = {
          key: nodeKey,
          title: segment,
          disableCheckbox: true,
          children: [],
        };
        currentLevel.push(targetNode);
      }

      currentLevel = targetNode.children || [];
      targetNode.children = currentLevel;
    });

    currentLevel.push({
      key: employee.id,
      title: `${employee.name} / ${employee.account}`,
      disabled: employee.id === currentEmployeeId,
    });
  });

  return rootNodes;
}

export function collectTreeKeys(nodes: StoreEmployeePermissionTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    node.key,
    ...(node.children?.length ? collectTreeKeys(node.children) : []),
  ]);
}

export function buildRoleScopedVisibleEmployeeIds(
  currentEmployee: StoreManagedEmployeeItem,
  employees: StoreManagedEmployeeItem[],
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems()
) {
  const roleMap = new Map(
    buildStoreRoleItems(roleItems).map((item) => [item.id, item] as const)
  );
  const visibleEmployeeIdSet = new Set<string>([currentEmployee.id]);

  currentEmployee.roleIds.forEach((roleId) => {
    const role = roleMap.get(roleId);

    if (!role) {
      return;
    }

    if (role.dataPermissions.viewScope === 'all') {
      employees.forEach((employee) => visibleEmployeeIdSet.add(employee.id));
      return;
    }

    if (role.dataPermissions.viewScope === 'department') {
      employees
        .filter((employee) =>
          isPathPrefix(currentEmployee.sourceDepartmentPath, employee.sourceDepartmentPath)
        )
        .forEach((employee) => visibleEmployeeIdSet.add(employee.id));
      return;
    }

    visibleEmployeeIdSet.add(currentEmployee.id);
  });

  return Array.from(visibleEmployeeIdSet);
}

export function resolveStoreEmployeeVisibleEmployeeIds(
  currentEmployee: StoreManagedEmployeeItem,
  employees: StoreManagedEmployeeItem[],
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems()
) {
  const visibleEmployeeIdSet = new Set(
    buildRoleScopedVisibleEmployeeIds(currentEmployee, employees, roleItems)
  );

  currentEmployee.effectiveVisibleEmployeeIds.forEach((employeeId) =>
    visibleEmployeeIdSet.add(employeeId)
  );

  return Array.from(visibleEmployeeIdSet);
}

export function getStoreRoleSelectionSummary(
  roleIds: string[],
  roleItems: EnterpriseRoleItem[] = readEnterpriseRoleItems()
) {
  const selectedRoleIdSet = new Set(roleIds);
  const roleMap = new Map(
    buildStoreRoleItems(roleItems).map((item) => [item.id, item] as const)
  );
  const selectedRoles = roleIds
    .map((roleId) => roleMap.get(roleId))
    .filter((item): item is EnterpriseRoleItem => Boolean(item));

  if (!selectedRoles.length) {
    return null;
  }

  const effectiveViewScope = selectedRoles.reduce<EnterpriseRoleDataViewScope>(
    (currentScope, role) =>
      STORE_ROLE_DATA_VIEW_SCOPE_PRIORITY[role.dataPermissions.viewScope] >
      STORE_ROLE_DATA_VIEW_SCOPE_PRIORITY[currentScope]
        ? role.dataPermissions.viewScope
        : currentScope,
    selectedRoles[0].dataPermissions.viewScope
  );
  const mergedFunctionPermissionKeys = Array.from(
    new Set(
      buildStoreRoleItems(roleItems)
        .filter((item) => selectedRoleIdSet.has(item.id))
        .flatMap((item) => item.functionPermissionKeys)
    )
  );

  return {
    selectedRoles,
    dataPermissionLabel:
      ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP[effectiveViewScope],
    dataPermissionDescription:
      ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP[effectiveViewScope],
    functionPermissionTitles: getEnterpriseRolePermissionTitles(
      mergedFunctionPermissionKeys,
      'store'
    ),
  };
}
