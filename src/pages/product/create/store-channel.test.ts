import { describe, expect, it } from 'vitest';
import {
  buildStoreChannelCreateSkuPayload,
  buildStoreChannelSkuMetaItems,
  createEmptyStoreChannelConfig,
  createStoreChannelConfigDraftFromProductConfig,
  STORE_CHANNEL_SINGLE_SKU_KEY,
  syncStoreChannelConfigDraft,
  validateStoreChannelSkuDraftMap,
  type StoreChannelSpecItem,
} from './store-channel';

describe('product create store channel helpers', () => {
  it('creates the default single config draft shape', () => {
    expect(createEmptyStoreChannelConfig()).toEqual({
      shareMode: 'product_pool',
      storeScope: 'allStores',
      storeIds: [],
      productPoolStoreConfigs: [],
    });
  });

  it('builds sku meta items from the shared source draft map', () => {
    expect(
      buildStoreChannelSkuMetaItems(
        'product_1',
        'multi',
        [
          { id: 1, name: '班级', value: '1v1' },
          { id: 2, name: '班级', value: '1v3' },
        ],
        {
          '1': {
            sourcePrice: 299,
            sourceStock: 18,
          },
          '2': {
            sourcePrice: 399,
            sourceStock: 12,
          },
        }
      )
    ).toEqual([
      {
        key: '1',
        skuId: 'sku-product_1-1',
        specLabel: '班级：1v1',
        sourcePrice: 299,
        sourceStock: 18,
      },
      {
        key: '2',
        skuId: 'sku-product_1-2',
        specLabel: '班级：1v3',
        sourcePrice: 399,
        sourceStock: 12,
      },
    ]);
  });

  it('maps single-spec source price and stock when store channel is off', () => {
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'product_1',
      specMode: 'single',
      specItems: [],
      storeChannelEnabled: false,
      sourceDraftMap: {
        [STORE_CHANNEL_SINGLE_SKU_KEY]: {
          sourcePrice: 199.5,
          sourceStock: 28,
        },
      },
      config: createEmptyStoreChannelConfig(),
      targetStoreIds: ['store_guangzhou'],
      createdAt: '2026-04-27 10:00:00',
    });

    expect(result.skus).toEqual([
      {
        id: 'sku-product_1-1',
        specText: '',
        price: 199.5,
        stock: 28,
        status: 'on',
      },
    ]);
    expect(result.price).toBe(199.5);
    expect(result.stock).toBe(28);
    expect(result.shareTargets).toEqual([]);
    expect(result.storeChannelConfig).toBeUndefined();
    expect(result.independentPriceRule).toEqual({
      enabled: false,
      skuRules: [],
    });
    expect(result.independentStockRule).toEqual({
      enabled: false,
      skuRules: [],
    });
  });

  it('maps store channel config and share targets when channel is on', () => {
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'product_1',
      specMode: 'single',
      specItems: [],
      storeChannelEnabled: true,
      sourceDraftMap: {
        [STORE_CHANNEL_SINGLE_SKU_KEY]: {
          sourcePrice: 299,
          sourceStock: 36,
        },
      },
      config: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_guangzhou',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuKeys: [STORE_CHANNEL_SINGLE_SKU_KEY],
            allowSelfPrice: true,
          },
          {
            storeId: 'store_shenzhen',
            sellStatus: 'unsellable',
            channelStatus: 'off',
            sellableSkuKeys: [],
            allowSelfPrice: false,
          },
        ],
      },
      targetStoreIds: ['store_guangzhou', 'store_shenzhen'],
      createdAt: '2026-04-27 10:00:00',
    });

    expect(result.skus).toEqual([
      {
        id: 'sku-product_1-1',
        specText: '',
        price: 299,
        stock: 36,
        status: 'on',
      },
    ]);
    expect(result.storeChannelConfig).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store_guangzhou'],
      productPoolStoreConfigs: [
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuIds: ['sku-product_1-1'],
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
        storeId: 'store_guangzhou',
        status: 'referenced',
        sharedAt: '2026-04-27 10:00:00',
        referencedAt: '2026-04-27 10:00:00',
        sellableSkuIds: ['sku-product_1-1'],
        allowSelfPrice: true,
      },
    ]);
  });

  it('preserves sku image, default flag and display status in store-scoped payload', () => {
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'product_1',
      specMode: 'multi',
      specItems: [
        { id: 'sku_a', name: '年级', value: '10年级' },
        { id: 'sku_b', name: '年级', value: '11年级' },
      ],
      storeChannelEnabled: false,
      sourceDraftMap: {
        sku_a: {
          sourcePrice: 199,
          sourceStock: 12,
          status: 'on',
          image: {
            id: 'image_1',
            name: '10年级图',
            url: 'https://example.com/10.png',
          },
          isDefaultSelected: true,
        },
        sku_b: {
          sourcePrice: 299,
          sourceStock: 8,
          status: 'off',
        },
      },
      config: createEmptyStoreChannelConfig(),
      targetStoreIds: [],
      createdAt: '2026-04-27 10:00:00',
    });

    expect(result.skus).toEqual([
      {
        id: 'sku-product_1-1',
        specText: '年级：10年级',
        price: 199,
        stock: 12,
        status: 'on',
        image: {
          id: 'image_1',
          name: '10年级图',
          url: 'https://example.com/10.png',
        },
        isDefaultSelected: true,
      },
      {
        id: 'sku-product_1-2',
        specText: '年级：11年级',
        price: 299,
        stock: 8,
        status: 'off',
      },
    ]);
  });

  it('supports shared-pool specific stores in payload', () => {
    const specItems: StoreChannelSpecItem[] = [
      { id: 1, name: '班级', value: '1v1' },
      { id: 2, name: '班级', value: '1v3' },
    ];
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'product_2',
      specMode: 'multi',
      specItems,
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
      },
      targetStoreIds: ['store_guangzhou', 'store_shenzhen'],
      createdAt: '2026-04-27 11:00:00',
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
        sharedAt: '2026-04-27 11:00:00',
        referencedAt: undefined,
        sellableSkuIds: ['sku-product_2-1', 'sku-product_2-2'],
      },
    ]);
  });

  it('requires at least one sellable store when product pool sharing is enabled', () => {
    expect(
      validateStoreChannelSkuDraftMap({
        specMode: 'single',
        specItems: [],
        storeChannelEnabled: true,
        sourceDraftMap: {
          [STORE_CHANNEL_SINGLE_SKU_KEY]: {
            sourcePrice: 199,
            sourceStock: 30,
          },
        },
        targetStoreIds: ['store_guangzhou'],
        config: {
          shareMode: 'product_pool',
          storeScope: 'specificStores',
          storeIds: ['store_guangzhou'],
          productPoolStoreConfigs: [
            {
              storeId: 'store_guangzhou',
              sellStatus: 'unsellable',
              channelStatus: 'off',
              sellableSkuKeys: [],
              allowSelfPrice: false,
            },
          ],
        },
      })
    ).toBe('请至少选择 1 家可售门店');
  });

  it('requires specific stores when shared pool is selected', () => {
    expect(
      validateStoreChannelSkuDraftMap({
        specMode: 'single',
        specItems: [],
        storeChannelEnabled: true,
        sourceDraftMap: {
          [STORE_CHANNEL_SINGLE_SKU_KEY]: {
            sourcePrice: 199,
            sourceStock: 30,
          },
        },
        targetStoreIds: ['store_guangzhou'],
        config: {
          shareMode: 'shared_pool',
          storeScope: 'specificStores',
          storeIds: [],
          productPoolStoreConfigs: [],
        },
      })
    ).toBe('请选择店铺');
  });

  it('filters stale sku references when specs change', () => {
    const synced = syncStoreChannelConfigDraft(
      {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_guangzhou',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuKeys: ['1', '2'],
            allowSelfPrice: true,
          },
        ],
      },
      ['1'],
      ['store_guangzhou', 'store_shenzhen']
    );

    expect(synced).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store_guangzhou'],
      sharedPoolSellableSkuKeys: [],
      productPoolStoreConfigs: [
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuKeys: ['1'],
          allowSelfPrice: true,
        },
        {
          storeId: 'store_shenzhen',
          sellStatus: 'unsellable',
          channelStatus: 'off',
          sellableSkuKeys: [],
          allowSelfPrice: false,
        },
      ],
    });
  });

  it('keeps explicit sellable status when sku selection becomes empty', () => {
    const synced = syncStoreChannelConfigDraft(
      {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_guangzhou',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuKeys: ['stale_sku'],
            allowSelfPrice: true,
          },
        ],
      },
      ['1'],
      ['store_guangzhou']
    );

    expect(synced).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store_guangzhou'],
      sharedPoolSellableSkuKeys: [],
      productPoolStoreConfigs: [
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuKeys: [],
          allowSelfPrice: false,
        },
      ],
    });
  });

  it('creates draft config from persisted config for page rehydration', () => {
    const draft = createStoreChannelConfigDraftFromProductConfig(
      {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_guangzhou',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuIds: ['sku-product_1-1'],
            allowSelfPrice: true,
          },
        ],
      },
      [
        {
          key: STORE_CHANNEL_SINGLE_SKU_KEY,
          skuId: 'sku-product_1-1',
          specLabel: '默认规格',
          sourcePrice: 299,
          sourceStock: 20,
        },
      ],
      ['store_guangzhou']
    );

    expect(draft).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store_guangzhou'],
      sharedPoolSellableSkuKeys: [],
      productPoolStoreConfigs: [
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuKeys: [STORE_CHANNEL_SINGLE_SKU_KEY],
          allowSelfPrice: true,
        },
      ],
    });
  });
});
