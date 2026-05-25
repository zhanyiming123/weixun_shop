import { describe, expect, it } from 'vitest';
import {
  buildComboCreateStoreChannelShareModePatch,
  COMBO_CREATE_SHARED_POOL_SHOW_SELLABLE_SKU,
} from './store-channel-shared-pool-config';

describe('buildComboCreateStoreChannelShareModePatch', () => {
  it('clears explicit sellable sku config when switching to shared pool', () => {
    expect(COMBO_CREATE_SHARED_POOL_SHOW_SELLABLE_SKU).toBe(false);
    expect(
      buildComboCreateStoreChannelShareModePatch('shared_pool', ['store-1'])
    ).toEqual({
      shareMode: 'shared_pool',
      storeScope: 'allStores',
      storeIds: [],
      sharedPoolSellableSkuKeys: [],
    });
  });

  it('keeps store ids when switching to product pool', () => {
    expect(
      buildComboCreateStoreChannelShareModePatch('product_pool', ['store-1'])
    ).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store-1'],
    });
  });
});
