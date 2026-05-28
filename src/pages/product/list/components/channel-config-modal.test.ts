import { describe, expect, it } from 'vitest';
import type { ProductListItem } from '@/types/product';
import {
  buildChannelConfigDraft,
  buildChannelConfigSubmitPayload,
  buildSharedPoolDraft,
} from './channel-config-modal';

function createProduct(
  overrides: Partial<ProductListItem> = {}
): ProductListItem {
  return {
    id: 'product_1',
    name: '测试商品',
    productKind: 'standard',
    productCatalogId: 'catalog_1',
    productOwnershipId: 'ownership_1',
    productType: 'virtual',
    inventoryUnit: '份',
    specMode: 'multi',
    skus: [
      {
        id: 'sku_1',
        specText: '规格1',
        price: 100,
        stock: 10,
        status: 'on',
      },
      {
        id: 'sku_2',
        specText: '规格2',
        price: 120,
        stock: 8,
        status: 'off',
      },
    ],
    status: 'on',
    price: 100,
    stock: 18,
    createdAt: '2026-04-23 12:00:00',
    sourceType: 'store',
    sourceStoreId: 'store_source',
    storeConfigs: [
      {
        storeId: 'store_source',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
    shareTargets: [],
    storeOverrides: {},
    storeView: {} as ProductListItem['storeView'],
    ...overrides,
  };
}

describe('channel config modal helpers', () => {
  it('builds a step-one draft from the current config', () => {
    const product = createProduct({
      storeChannelConfig: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_target'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_target',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuIds: ['sku_1'],
          },
        ],
      },
    });

    expect(buildChannelConfigDraft(product)).toEqual({
      enabled: true,
      shareMode: 'product_pool',
    });
  });

  it('builds shared-pool step-two draft from pending share targets', () => {
    const product = createProduct({
      storeChannelConfig: {
        shareMode: 'shared_pool',
        storeScope: 'allStores',
        storeIds: [],
        productPoolStoreConfigs: [],
      },
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'pending',
          sharedAt: '2026-04-23 12:00:00',
          sellableSkuIds: ['sku_1'],
          allowSelfPrice: true,
        },
      ],
    });

    expect(buildSharedPoolDraft(product)).toEqual({
      sellableSkuIds: ['sku_1'],
      allowSelfPrice: true,
    });
  });

  it('builds a submit payload for product-pool step-two configs', () => {
    const product = createProduct();

    expect(
      buildChannelConfigSubmitPayload(
        product,
        {
          enabled: true,
          shareMode: 'product_pool',
        },
        [
          {
            storeId: 'store_target',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuIds: ['sku_1'],
          },
        ],
        {
          sellableSkuIds: ['sku_1'],
          allowSelfPrice: false,
        }
      )
    ).toEqual({
      enabled: true,
      storeChannelConfig: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_target'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_target',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuIds: ['sku_1'],
          },
        ],
      },
    });
  });

  it('builds a submit payload for shared-pool step-two configs', () => {
    const product = createProduct();

    expect(
      buildChannelConfigSubmitPayload(
        product,
        {
          enabled: true,
          shareMode: 'shared_pool',
        },
        [],
        {
          sellableSkuIds: ['sku_1'],
          allowSelfPrice: true,
        }
      )
    ).toEqual({
      enabled: true,
      storeChannelConfig: {
        shareMode: 'shared_pool',
        storeScope: 'allStores',
        storeIds: [],
        productPoolStoreConfigs: [],
      },
      sharedPoolSellableSkuIds: ['sku_1'],
      sharedPoolAllowSelfPrice: true,
    });
  });
});
