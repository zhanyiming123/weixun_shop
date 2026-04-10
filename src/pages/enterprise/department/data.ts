import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { isSSR } from '@/utils/is';
import {
  OrganizationItem,
  readOrganizationItems,
} from '@/pages/enterprise/organization/data';
import {
  ProductOwnershipConfigItem,
  readProductOwnershipItems,
  writeProductOwnershipItems,
} from '@/pages/product/category/data';
import {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type EnterpriseDepartmentScope = 'headquarter' | 'store';

export type EnterpriseDepartmentStoreOption = {
  value: string;
  label: string;
};

export type EnterpriseDepartmentTreeNode = {
  key: string;
  value: string;
  title: string;
  children?: EnterpriseDepartmentTreeNode[];
};

export type EnterpriseDepartmentItem = {
  id: string;
  name: string;
  code: string;
  scope: EnterpriseDepartmentScope;
  storeId: string | null;
  parentId: string | null;
  managerName: string;
  headcount: number;
  description: string;
  updatedAt: string;
};

type EnterpriseDepartmentHeadquarterMeta = Pick<
  EnterpriseDepartmentItem,
  'id' | 'code' | 'managerName' | 'headcount' | 'description' | 'updatedAt'
>;

const STORAGE_KEY = 'enterprise-department-items-v3';
const LEGACY_TAB_STORAGE_KEY = 'enterprise-department-items-v2';
const LEGACY_SINGLE_STORAGE_KEY = 'enterprise-department-items-v1';

export const ENTERPRISE_DEPARTMENT_SCOPE_LABEL_MAP: Record<
  EnterpriseDepartmentScope,
  string
> = {
  headquarter: '总部',
  store: '门店',
};

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

export function formatEnterpriseDepartmentDateTime(date: Date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function hasStorageValue(key: string) {
  if (isSSR) {
    return false;
  }

  return localStorage.getItem(key) !== null;
}

function normalizeEnterpriseDepartmentScope(
  value: unknown
): EnterpriseDepartmentScope {
  return value === 'store' ? 'store' : 'headquarter';
}

function normalizeDepartmentCode(rawCode: unknown, fallbackCode: string) {
  const normalizedCode =
    typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';

  return normalizedCode || fallbackCode;
}

function normalizeHeadcount(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function createHeadquarterDepartmentCode(id: string) {
  const normalizedId = id
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

  return normalizedId ? `HQ-${normalizedId}` : 'HQ-DEPT';
}

function readStoreOrganizations() {
  return readOrganizationItems().filter((item) => item.type === 'store');
}

export function readEnterpriseDepartmentStoreOptions(
  storeOrganizations: OrganizationItem[] = readStoreOrganizations()
): EnterpriseDepartmentStoreOption[] {
  return storeOrganizations.map((item) => ({
    value: item.id,
    label: item.name,
  }));
}

function createStoreDepartmentItems(store: OrganizationItem, index: number) {
  const rootId = `department_store_${store.id}_01`;
  const teachingId = `${rootId}_01`;
  const serviceId = `${rootId}_02`;
  const frontDeskId = `${rootId}_03`;
  const codePrefix = store.code || `STORE-${index + 1}`;

  return [
    {
      id: rootId,
      name: '校区运营部',
      code: `${codePrefix}-OPS`,
      scope: 'store' as const,
      storeId: store.id,
      parentId: null,
      managerName: store.managerName,
      headcount: 6,
      description: `负责${store.name}的日常经营运营与资源协调`,
      updatedAt: '2026-03-29 09:20:00',
    },
    {
      id: teachingId,
      name: '招生咨询组',
      code: `${codePrefix}-CONSULT`,
      scope: 'store' as const,
      storeId: store.id,
      parentId: rootId,
      managerName: '',
      headcount: 2,
      description: '负责咨询接待、试听安排和签约转化',
      updatedAt: '2026-03-29 09:40:00',
    },
    {
      id: serviceId,
      name: '教务服务组',
      code: `${codePrefix}-SERVICE`,
      scope: 'store' as const,
      storeId: store.id,
      parentId: rootId,
      managerName: '',
      headcount: 2,
      description: '负责排课、学员服务和课时履约',
      updatedAt: '2026-03-29 09:50:00',
    },
    {
      id: frontDeskId,
      name: '前台接待组',
      code: `${codePrefix}-FRONT`,
      scope: 'store' as const,
      storeId: store.id,
      parentId: rootId,
      managerName: '',
      headcount: 1,
      description: '负责到店接待、登记和现场服务支持',
      updatedAt: '2026-03-29 10:00:00',
    },
  ];
}

function createDefaultStoreDepartmentItems(
  storeOrganizations: OrganizationItem[] = readStoreOrganizations()
) {
  return storeOrganizations.flatMap((store, index) =>
    createStoreDepartmentItems(store, index)
  );
}

function normalizeDepartmentItem(
  item: Partial<EnterpriseDepartmentItem>,
  index: number
): EnterpriseDepartmentItem {
  const scope = normalizeEnterpriseDepartmentScope(item.scope);

  return {
    id: item.id || `department_${index + 1}`,
    name: item.name || `部门${index + 1}`,
    code: normalizeDepartmentCode(item.code, `DEPT-${index + 1}`),
    scope,
    storeId:
      scope === 'store' && typeof item.storeId === 'string' && item.storeId
        ? item.storeId
        : null,
    parentId: typeof item.parentId === 'string' ? item.parentId : null,
    managerName: item.managerName || '',
    headcount: normalizeHeadcount(item.headcount),
    description: item.description || '',
    updatedAt: item.updatedAt || formatEnterpriseDepartmentDateTime(new Date()),
  };
}

function normalizeDepartmentItems(rawItems: Partial<EnterpriseDepartmentItem>[] = []) {
  return rawItems.map((item, index) => normalizeDepartmentItem(item, index));
}

function normalizeHeadquarterMetaItem(
  item: Partial<EnterpriseDepartmentItem>,
  fallbackId: string
): EnterpriseDepartmentHeadquarterMeta {
  const nextId = item.id || fallbackId;

  return {
    id: nextId,
    code: normalizeDepartmentCode(
      item.code,
      createHeadquarterDepartmentCode(nextId)
    ),
    managerName: item.managerName || '',
    headcount: normalizeHeadcount(item.headcount),
    description: item.description || '',
    updatedAt: item.updatedAt || formatEnterpriseDepartmentDateTime(new Date()),
  };
}

function extractHeadquarterMetaItems(items: EnterpriseDepartmentItem[]) {
  return items
    .filter((item) => item.scope === 'headquarter')
    .map(
      ({
        id,
        code,
        managerName,
        headcount,
        description,
        updatedAt,
      }): EnterpriseDepartmentHeadquarterMeta => ({
        id,
        code,
        managerName,
        headcount,
        description,
        updatedAt,
      })
    );
}

function buildHeadquarterDepartmentItems(
  ownershipItems: ProductOwnershipConfigItem[],
  rawMetaItems: Partial<EnterpriseDepartmentItem>[] = []
) {
  const metaMap = new Map(
    rawMetaItems
      .filter(
        (item): item is Partial<EnterpriseDepartmentItem> & { id: string } =>
          typeof item.id === 'string' && item.id.trim().length > 0
      )
      .map((item) => [item.id, normalizeHeadquarterMetaItem(item, item.id)])
  );

  return ownershipItems.map((item) => {
    const meta =
      metaMap.get(item.id) || normalizeHeadquarterMetaItem({ id: item.id }, item.id);

    return {
      id: item.id,
      name: item.name,
      code: meta.code,
      scope: 'headquarter' as const,
      storeId: null,
      parentId: item.parentId,
      managerName: meta.managerName,
      headcount: meta.headcount,
      description: meta.description,
      updatedAt: meta.updatedAt,
    };
  });
}

function toProductOwnershipItems(items: EnterpriseDepartmentItem[]) {
  return items
    .filter((item) => item.scope === 'headquarter')
    .map(
      ({ id, name, parentId }): ProductOwnershipConfigItem => ({
        id,
        name,
        parentId,
      })
    );
}

function cloneStoreTreeToTargetStore(
  items: EnterpriseDepartmentItem[],
  storeId: string
) {
  const idMap = new Map(
    items.map((item) => [item.id, `${item.id}__${storeId}`])
  );

  return items.map((item) => ({
    ...item,
    id: idMap.get(item.id) || item.id,
    storeId,
    parentId: item.parentId ? idMap.get(item.parentId) || item.parentId : null,
  }));
}

function migrateGenericStoreItems(
  items: EnterpriseDepartmentItem[],
  storeOrganizations: OrganizationItem[]
) {
  const headquarterItems = items.filter((item) => item.scope === 'headquarter');
  const storeItems = items.filter((item) => item.scope === 'store');

  if (!storeItems.length) {
    return [...headquarterItems, ...createDefaultStoreDepartmentItems(storeOrganizations)];
  }

  const scopedStoreItems = storeItems.filter((item) => item.storeId);
  const genericStoreItems = storeItems.filter((item) => !item.storeId);

  if (!genericStoreItems.length) {
    return [...headquarterItems, ...scopedStoreItems];
  }

  const existingStoreIds = new Set(
    scopedStoreItems
      .map((item) => item.storeId)
      .filter((item): item is string => Boolean(item))
  );

  const clonedStoreItems = storeOrganizations.flatMap((store) => {
    if (existingStoreIds.has(store.id)) {
      return [];
    }

    return cloneStoreTreeToTargetStore(genericStoreItems, store.id);
  });

  return [...headquarterItems, ...scopedStoreItems, ...clonedStoreItems];
}

function migrateSingleTreeItems(
  rawItems: Partial<EnterpriseDepartmentItem>[],
  storeOrganizations: OrganizationItem[]
) {
  const normalizedHeadquarterItems = rawItems.map((item, index) =>
    normalizeDepartmentItem(
      {
        ...item,
        scope: 'headquarter',
        storeId: null,
      },
      index
    )
  );

  return [
    ...normalizedHeadquarterItems,
    ...createDefaultStoreDepartmentItems(storeOrganizations),
  ];
}

function readPersistedDepartmentItems(
  storeOrganizations: OrganizationItem[] = readStoreOrganizations()
) {
  if (hasStorageValue(STORAGE_KEY)) {
    return normalizeDepartmentItems(
      readPersistentValue<Partial<EnterpriseDepartmentItem>[]>(STORAGE_KEY, [])
    );
  }

  if (hasStorageValue(LEGACY_TAB_STORAGE_KEY)) {
    return migrateGenericStoreItems(
      normalizeDepartmentItems(
        readPersistentValue<Partial<EnterpriseDepartmentItem>[]>(
          LEGACY_TAB_STORAGE_KEY,
          []
        )
      ),
      storeOrganizations
    );
  }

  if (hasStorageValue(LEGACY_SINGLE_STORAGE_KEY)) {
    return migrateSingleTreeItems(
      readPersistentValue<Partial<EnterpriseDepartmentItem>[]>(
        LEGACY_SINGLE_STORAGE_KEY,
        []
      ),
      storeOrganizations
    );
  }

  return createDefaultStoreDepartmentItems(storeOrganizations);
}

export function readEnterpriseDepartmentItems() {
  const storeOrganizations = readStoreOrganizations();
  const persistedItems = readPersistedDepartmentItems(storeOrganizations);
  const headquarterItems = buildHeadquarterDepartmentItems(
    readProductOwnershipItems(),
    extractHeadquarterMetaItems(persistedItems)
  );
  const storeItems = persistedItems.filter((item) => item.scope === 'store');

  return [...headquarterItems, ...storeItems];
}

export function getEnterpriseDepartmentItemsByScope(
  scope: EnterpriseDepartmentScope,
  storeId?: string,
  items: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  return items.filter((item) => {
    if (item.scope !== scope) {
      return false;
    }

    if (scope === 'store') {
      return item.storeId === storeId;
    }

    return true;
  });
}

export function buildEnterpriseDepartmentTree(
  scope: EnterpriseDepartmentScope,
  storeId?: string,
  items: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
): EnterpriseDepartmentTreeNode[] {
  const scopedItems = getEnterpriseDepartmentItemsByScope(scope, storeId, items);
  const childrenMap = new Map<string | null, EnterpriseDepartmentItem[]>();

  scopedItems.forEach((item) => {
    const group = childrenMap.get(item.parentId) || [];
    group.push(item);
    childrenMap.set(item.parentId, group);
  });

  const buildNode = (item: EnterpriseDepartmentItem): EnterpriseDepartmentTreeNode => ({
    key: item.id,
    value: item.id,
    title: item.name,
    children: (childrenMap.get(item.id) || []).map(buildNode),
  });

  return (childrenMap.get(null) || []).map(buildNode);
}

export function useEnterpriseDepartmentItems() {
  const [items, setItems] = useState<EnterpriseDepartmentItem[]>(
    () => readEnterpriseDepartmentItems()
  );

  useEffect(() => {
    writePersistentValue(STORAGE_KEY, items);
    writeProductOwnershipItems(toProductOwnershipItems(items));
  }, [items]);

  return [items, setItems] as [
    EnterpriseDepartmentItem[],
    Dispatch<SetStateAction<EnterpriseDepartmentItem[]>>
  ];
}

export function normalizeEnterpriseDepartmentTab(
  value: unknown
): EnterpriseDepartmentScope {
  return normalizeEnterpriseDepartmentScope(value);
}

export function getEnterpriseDepartmentListPath(
  scope: EnterpriseDepartmentScope,
  storeId?: string
) {
  if (scope === 'store' && storeId) {
    return `/enterprise/department?tab=${scope}&storeId=${storeId}`;
  }

  return `/enterprise/department?tab=${scope}`;
}
