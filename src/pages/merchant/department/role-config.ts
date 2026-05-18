import {
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import { readEnterpriseRoleItems } from '@/pages/enterprise/role/data';
import { filterMerchantRoleItems } from '@/pages/merchant/role/tab-config';

export const ALL_STORES_TREE_VALUE = '__all_stores__';

export type MerchantRoleConfig = {
  storeScopeIds: string[];
  merchantRoleId: string;
};

export type MerchantStoreRoleBinding = {
  id: string;
  storeIds: string[];
  storeRoleId: string;
};

export type MerchantStoreTreeNode = {
  key: string;
  value: string;
  title: string;
  children?: MerchantStoreTreeNode[];
};

export type MerchantRoleOption = {
  value: string;
  label: string;
};

function normalizeStringValues(value: unknown) {
  if (!Array.isArray(value)) {
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }

    return [];
  }

  return Array.from(
    new Set(
      value.flatMap((item) => {
        if (typeof item === 'string') {
          const normalized = item.trim();
          return normalized ? [normalized] : [];
        }

        if (
          item &&
          typeof item === 'object' &&
          'value' in item &&
          typeof (item as { value?: unknown }).value === 'string'
        ) {
          const normalized = (item as { value: string }).value.trim();
          return normalized ? [normalized] : [];
        }

        return [];
      })
    )
  );
}

export function createEmptyMerchantRoleConfig(): MerchantRoleConfig {
  return {
    storeScopeIds: [],
    merchantRoleId: '',
  };
}

export function createMerchantStoreRoleBinding(): MerchantStoreRoleBinding {
  return {
    id: `merchant_store_role_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    storeIds: [],
    storeRoleId: '',
  };
}

export function buildMerchantStoreTreeData(
  storeItems: ProductStoreItem[] = readProductStoreItems()
): MerchantStoreTreeNode[] {
  return [
    {
      key: ALL_STORES_TREE_VALUE,
      value: ALL_STORES_TREE_VALUE,
      title: '全部店铺',
      children: storeItems.map((store) => ({
        key: store.id,
        value: store.id,
        title: store.name,
      })),
    },
  ];
}

export function normalizeMerchantStoreScopeIds(
  value: unknown,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const storeIdSet = new Set(storeItems.map((item) => item.id));
  const normalizedValues = normalizeStringValues(value);

  if (normalizedValues.includes(ALL_STORES_TREE_VALUE)) {
    return storeItems.map((item) => item.id);
  }

  return normalizedValues.filter((item) => storeIdSet.has(item));
}

export function buildMerchantRoleOptions() {
  return filterMerchantRoleItems(readEnterpriseRoleItems(), 'merchant').map(
    (item): MerchantRoleOption => ({
      value: item.id,
      label: item.name,
    })
  );
}

export function buildStoreRoleOptions() {
  return filterMerchantRoleItems(readEnterpriseRoleItems(), 'store').map(
    (item): MerchantRoleOption => ({
      value: item.id,
      label: item.name,
    })
  );
}

export function summarizeStoreNames(
  storeIds: string[],
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const storeNameMap = new Map(storeItems.map((item) => [item.id, item.name] as const));

  return Array.from(
    new Set(
      storeIds.flatMap((storeId) => {
        const storeName = storeNameMap.get(storeId);
        return storeName ? [storeName] : [];
      })
    )
  ).join('、');
}

export function summarizeStoreManagers(
  storeIds: string[],
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const managerNameMap = new Map(
    storeItems.map((item) => [item.id, item.managerName] as const)
  );

  return Array.from(
    new Set(
      storeIds.flatMap((storeId) => {
        const managerName = managerNameMap.get(storeId)?.trim();
        return managerName ? [managerName] : [];
      })
    )
  ).join('、');
}
