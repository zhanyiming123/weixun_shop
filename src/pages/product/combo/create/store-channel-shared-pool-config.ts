import type { StoreChannelConfigDraftItem } from './store-channel';

export const COMBO_CREATE_SHARED_POOL_SHOW_SELLABLE_SKU = false;

export function buildComboCreateStoreChannelShareModePatch(
  shareMode: StoreChannelConfigDraftItem['shareMode'],
  storeIds: string[]
): Partial<StoreChannelConfigDraftItem> {
  return {
    shareMode,
    storeScope:
      shareMode === 'product_pool'
        ? ('specificStores' as const)
        : ('allStores' as const),
    storeIds: shareMode === 'product_pool' ? storeIds : [],
    ...(shareMode === 'shared_pool'
      ? { sharedPoolSellableSkuKeys: [] }
      : {}),
  };
}
