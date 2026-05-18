import {
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import { readEnterpriseRoleItems } from '@/pages/enterprise/role/data';
import { filterMerchantRoleItems } from '@/pages/merchant/role/tab-config';

export const ALL_STORES_TREE_VALUE = '__all_stores__';

export type MerchantRoleConfig = {
  storeScopeIds: string[];
  merchantRoleIds: string[];
};

export type MerchantStoreRoleBinding = {
  id: string;
  storeIds: string[];
  storeRoleIds: string[];
};

export type MerchantStoreTreeNode = {
  key: string;
  value: string;
  title: string;
  disabled?: boolean;
  children?: MerchantStoreTreeNode[];
};

export type MerchantRoleOption = {
  value: string;
  label: string;
};

export type MerchantStoreRoleBindingValidationResult = {
  normalizedBindings: MerchantStoreRoleBinding[];
  errorCode: 'incomplete' | 'duplicate' | null;
  duplicateStoreIds: string[];
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
    merchantRoleIds: [],
  };
}

export function createMerchantStoreRoleBinding(): MerchantStoreRoleBinding {
  return {
    id: `merchant_store_role_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    storeIds: [],
    storeRoleIds: [],
  };
}

export function buildMerchantStoreTreeData(
  storeItems: ProductStoreItem[] = readProductStoreItems()
): MerchantStoreTreeNode[] {
  return [
    {
      key: ALL_STORES_TREE_VALUE,
      value: ALL_STORES_TREE_VALUE,
      title: '全部',
      children: storeItems.map((store) => ({
        key: store.id,
        value: store.id,
        title: store.name,
      })),
    },
  ];
}

export function collectConfiguredStoreIds(
  bindings: MerchantStoreRoleBinding[],
  currentBindingId?: string,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  return bindings.reduce((storeIdSet, binding) => {
    if (binding.id === currentBindingId) {
      return storeIdSet;
    }

    normalizeMerchantStoreScopeIds(binding.storeIds, storeItems).forEach((storeId) => {
      storeIdSet.add(storeId);
    });

    return storeIdSet;
  }, new Set<string>());
}

export function buildSelectableMerchantStoreTreeData(
  bindings: MerchantStoreRoleBinding[],
  currentBindingId?: string,
  storeItems: ProductStoreItem[] = readProductStoreItems()
): MerchantStoreTreeNode[] {
  const configuredStoreIds = collectConfiguredStoreIds(
    bindings,
    currentBindingId,
    storeItems
  );

  return [
    {
      key: ALL_STORES_TREE_VALUE,
      value: ALL_STORES_TREE_VALUE,
      title: '全部',
      disabled: configuredStoreIds.size > 0,
      children: storeItems.map((store) => ({
        key: store.id,
        value: store.id,
        title: store.name,
        disabled: configuredStoreIds.has(store.id),
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

export function normalizeMerchantRoleIds(value: unknown) {
  return normalizeStringValues(value);
}

export function buildMerchantRoleOptions() {
  return filterMerchantRoleItems(readEnterpriseRoleItems(), 'merchant').map(
    (item): MerchantRoleOption => ({
      value: item.id,
      label: item.name,
    })
  );
}

export function buildMerchantRoleLabelMap() {
  return new Map(
    buildMerchantRoleOptions().map((item) => [item.value, item.label] as const)
  );
}

export function getMerchantRoleDisplay(
  merchantRoleIds: unknown,
  roleLabelMap = buildMerchantRoleLabelMap()
) {
  const labels = normalizeMerchantRoleIds(merchantRoleIds).flatMap((roleId) => {
    const label = roleLabelMap.get(roleId);
    return label ? [label] : [];
  });

  return labels.join('、');
}

export function buildStoreRoleOptions() {
  return filterMerchantRoleItems(readEnterpriseRoleItems(), 'store').map(
    (item): MerchantRoleOption => ({
      value: item.id,
      label: item.name,
    })
  );
}

export function validateMerchantStoreRoleBindings(
  bindings: MerchantStoreRoleBinding[],
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const normalizedBindings = bindings
    .map((binding) => ({
      id: binding.id,
      storeIds: normalizeMerchantStoreScopeIds(binding.storeIds, storeItems),
      storeRoleIds: normalizeMerchantRoleIds(binding.storeRoleIds),
    }))
    .filter((binding) => binding.storeIds.length > 0 || binding.storeRoleIds.length > 0);
  const hasIncompleteBinding = normalizedBindings.some(
    (binding) => binding.storeIds.length > 0 && !binding.storeRoleIds.length
  );

  if (hasIncompleteBinding) {
    return {
      normalizedBindings,
      errorCode: 'incomplete',
      duplicateStoreIds: [],
    };
  }

  const seenStoreIds = new Set<string>();
  const duplicateStoreIds = new Set<string>();

  normalizedBindings.forEach((binding) => {
    binding.storeIds.forEach((storeId) => {
      if (seenStoreIds.has(storeId)) {
        duplicateStoreIds.add(storeId);
        return;
      }

      seenStoreIds.add(storeId);
    });
  });

  return {
    normalizedBindings,
    errorCode: duplicateStoreIds.size ? 'duplicate' : null,
    duplicateStoreIds: Array.from(duplicateStoreIds),
  };
}
