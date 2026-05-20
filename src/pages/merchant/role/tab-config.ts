import { EnterpriseRoleItem, EnterpriseRoleScope } from '@/pages/enterprise/role/data';

export type MerchantRoleTab = 'merchant' | 'store';
export type MerchantRoleType = 'merchant' | 'store';

export const MERCHANT_ROLE_TAB_LABEL_MAP: Record<MerchantRoleTab, string> = {
  merchant: '商户角色',
  store: '店铺角色',
};

export const MERCHANT_ROLE_TYPE_LABEL_MAP: Record<MerchantRoleType, string> = {
  merchant: '电商管理角色',
  store: '店铺角色',
};

export function normalizeMerchantRoleTab(value: unknown): MerchantRoleTab {
  if (value === 'store') {
    return 'store';
  }

  return 'merchant';
}

export function getMerchantRoleCreateScope(
  tab: MerchantRoleTab
): EnterpriseRoleScope {
  return tab === 'store' ? 'store' : 'headquarter';
}

export function getMerchantRoleTypeByScope(
  scope: EnterpriseRoleScope
): MerchantRoleType {
  return scope === 'store' ? 'store' : 'merchant';
}

export function getMerchantRoleScopeByType(
  type: MerchantRoleType
): EnterpriseRoleScope {
  return type === 'store' ? 'store' : 'headquarter';
}

export function filterMerchantRoleItems(
  items: EnterpriseRoleItem[],
  tab: MerchantRoleTab
) {
  return items
    .filter((item) => {
      if (tab === 'store') {
        return item.scope === 'store';
      }

      return (
        item.scope !== 'store' &&
        (
          item.id.startsWith('role_merchant_') ||
          (!item.isDefault && Boolean(item.merchantPermissionConfigs))
        )
      );
    })
    .sort((left, right) => {
      if (left.isDefault !== right.isDefault) {
        return Number(right.isDefault) - Number(left.isDefault);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

export function getMerchantRoleListTabPath(
  pathname: string,
  tab: MerchantRoleTab
) {
  return `${pathname}?tab=${tab}`;
}

export function supportsMerchantRoleBatchSelection(tab: MerchantRoleTab) {
  return tab === 'merchant';
}
