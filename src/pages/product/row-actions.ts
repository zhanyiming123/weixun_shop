export type ProductRowActionKey =
  | 'detail'
  | 'channel-config'
  | 'store-setting'
  | 'copy'
  | 'edit'
  | 'sales-store'
  | 'sell-status'
  | 'channel-status'
  | 'sku-manage'
  | 'stock'
  | 'share';

type GetPrimaryProductRowActionKeysOptions = {
  currentStoreId?: string;
  isShared: boolean;
  canManageStoreSettings: boolean;
};

export function getPrimaryProductRowActionKeys(
  actionKeys: string[],
  options: GetPrimaryProductRowActionKeysOptions
) {
  if (!options.currentStoreId || !options.isShared) {
    return actionKeys.slice(0, 3);
  }

  const preferredKeys: string[] = [
    'detail',
    ...(options.canManageStoreSettings ? ['store-setting'] : []),
    'channel-status',
  ];
  const seenKeys = new Set<string>();

  return [...preferredKeys, ...actionKeys].filter((key) => {
    if (!actionKeys.includes(key) || seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  }).slice(0, 3);
}
