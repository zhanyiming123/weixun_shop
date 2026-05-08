import { describe, expect, it } from 'vitest';
import {
  buildStoreChannelCreateSkuPayload,
  createEmptyStoreChannelConfig,
  syncStoreChannelConfigDraft,
} from './store-channel';

describe('product combo create store channel helpers', () => {
  it('creates the default config draft shape', () => {
    expect(createEmptyStoreChannelConfig()).toEqual({
      shareMode: 'product_pool',
      storeScope: 'allStores',
      storeIds: [],
      productPoolStoreConfigs: [],
    });
  });

  it('supports product-pool targets in payload', () => {
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'combo_1',
      specMode: 'single',
      specItems: [],
      storeChannelEnabled: true,
      sourceDraftMap: {
        single: {
          sourcePrice: 1299,
          sourceStock: 18,
        },
      },
      config: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_beijing'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_beijing',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuKeys: ['single'],
            allowSelfPrice: true,
          },
        ],
      },
      targetStoreIds: ['store_beijing', 'store_shenzhen'],
      createdAt: '2026-05-06 09:30:00',
    });

    expect(result.storeChannelConfig).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store_beijing'],
      productPoolStoreConfigs: [
        {
          storeId: 'store_beijing',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuIds: ['sku-combo_1-1'],
          allowSelfPrice: true,
        },
        {
          storeId: 'store_shenzhen',
          sellStatus: 'unsellable',
          channelStatus: 'off',
        },
      ],
    });
    expect(result.shareTargets).toEqual([
      {
        storeId: 'store_beijing',
        status: 'referenced',
        sharedAt: '2026-05-06 09:30:00',
        referencedAt: '2026-05-06 09:30:00',
        sellableSkuIds: ['sku-combo_1-1'],
        allowSelfPrice: true,
      },
    ]);
  });

  it('supports shared-pool sellable sku selection and self-pricing in payload', () => {
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'combo_1',
      specMode: 'multi',
      specItems: [
        { id: 1, name: '班型', value: '1v1' },
        { id: 2, name: '班型', value: '1v3' },
      ],
      storeChannelEnabled: true,
      sourceDraftMap: {
        '1': {
          sourcePrice: 800,
          sourceStock: 10,
        },
        '2': {
          sourcePrice: 600,
          sourceStock: 20,
        },
      },
      config: {
        shareMode: 'shared_pool',
        storeScope: 'specificStores',
        storeIds: ['store_shenzhen'],
        productPoolStoreConfigs: [],
        sharedPoolSellableSkuKeys: ['2'],
        sharedPoolAllowSelfPrice: true,
      },
      targetStoreIds: ['store_guangzhou', 'store_shenzhen'],
      createdAt: '2026-05-06 10:00:00',
    });

    expect(result.storeChannelConfig).toEqual({
      shareMode: 'shared_pool',
      storeScope: 'specificStores',
      storeIds: ['store_shenzhen'],
      productPoolStoreConfigs: [],
    });
    expect(result.shareTargets).toEqual([
      {
        storeId: 'store_shenzhen',
        status: 'pending',
        sharedAt: '2026-05-06 10:00:00',
        referencedAt: undefined,
        sellableSkuIds: ['sku-combo_1-2'],
        allowSelfPrice: true,
      },
    ]);
  });

  it('filters stale shared-pool sku references when specs change', () => {
    const synced = syncStoreChannelConfigDraft(
      {
        shareMode: 'shared_pool',
        storeScope: 'allStores',
        storeIds: [],
        productPoolStoreConfigs: [],
        sharedPoolSellableSkuKeys: ['1', 'stale_sku'],
        sharedPoolAllowSelfPrice: true,
      },
      ['1'],
      ['store_guangzhou']
    );

    expect(synced).toEqual({
      shareMode: 'shared_pool',
      storeScope: 'allStores',
      storeIds: [],
      productPoolStoreConfigs: [
        {
          storeId: 'store_guangzhou',
          sellStatus: 'unsellable',
          channelStatus: 'off',
          sellableSkuKeys: [],
          allowSelfPrice: false,
        },
      ],
      sharedPoolSellableSkuKeys: ['1'],
      sharedPoolAllowSelfPrice: true,
    });
  });
});
