import { describe, expect, it } from 'vitest';
import {
  applyUnsellableWhenNoSellableSku,
  sanitizeStoreShareSettingMapByEnabledSkuKeys,
  type StoreShareSettingItem,
} from './share-config';
import type { ProductStoreConfigItem } from '../store-config/data';

describe('product create share config helpers', () => {
  it('removes disabled sku keys from store share settings', () => {
    const source: Record<string, StoreShareSettingItem> = {
      store_a: {
        shareMode: 'product_pool',
        sellableSkuKeys: ['sku_1', 'sku_2'],
      },
      store_b: {
        shareMode: 'shared_pool',
        sellableSkuKeys: ['sku_2', 'sku_3'],
      },
    };

    const sanitized = sanitizeStoreShareSettingMapByEnabledSkuKeys(source, ['sku_1', 'sku_3']);

    expect(sanitized).toEqual({
      store_a: {
        shareMode: 'product_pool',
        sellableSkuKeys: ['sku_1'],
      },
      store_b: {
        shareMode: 'shared_pool',
        sellableSkuKeys: ['sku_3'],
      },
    });
  });

  it('marks sellable stores as unsellable when no sellable sku left', () => {
    const storeConfigs: ProductStoreConfigItem[] = [
      {
        storeId: 'store_a',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_b',
        sellStatus: 'sellable',
        channelStatus: 'off',
      },
    ];
    const storeShareSettingMap: Record<string, StoreShareSettingItem> = {
      store_a: {
        shareMode: 'product_pool',
        sellableSkuKeys: ['sku_1'],
      },
      store_b: {
        shareMode: 'shared_pool',
        sellableSkuKeys: ['sku_2'],
      },
    };

    const nextConfigs = applyUnsellableWhenNoSellableSku(
      storeConfigs,
      storeShareSettingMap,
      ['sku_1']
    );

    expect(nextConfigs).toEqual([
      {
        storeId: 'store_a',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_b',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ]);
  });
});
