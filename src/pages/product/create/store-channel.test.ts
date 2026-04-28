import { describe, expect, it } from 'vitest';
import {
  buildStoreChannelSkuMetaItems,
  buildStoreChannelCreateSkuPayload,
  canRemoveStoreChannelRule,
  createEmptyStoreChannelRule,
  removeStoreChannelRuleDrafts,
  STORE_CHANNEL_SINGLE_SKU_KEY,
  syncStoreChannelRuleDrafts,
  validateStoreChannelSkuDraftMap,
  type StoreChannelRuleDraftItem,
  type StoreChannelSkuDraftMap,
  type StoreChannelSpecItem,
} from './store-channel';

describe('product create store channel helpers', () => {
  it('creates the default rule draft shape', () => {
    expect(createEmptyStoreChannelRule()).toMatchObject({
      fieldKeys: [],
      storeScope: 'allStores',
      storeIds: [],
      skuScope: 'allSkus',
      skuKeys: [],
      shareMode: 'product_pool',
      skuConfigs: [],
    });
  });

  it('allows deleting the last rule draft', () => {
    const rule = createEmptyStoreChannelRule();

    expect(removeStoreChannelRuleDrafts([rule], rule.id)).toEqual([]);
  });

  it('keeps the first rule non-removable', () => {
    expect(canRemoveStoreChannelRule(0)).toBe(false);
    expect(canRemoveStoreChannelRule(1)).toBe(true);
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
      rules: [],
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
    expect(result.storeChannelRules).toEqual([]);
    expect(result.independentPriceRule).toEqual({
      enabled: false,
      skuRules: [],
    });
    expect(result.independentStockRule).toEqual({
      enabled: false,
      skuRules: [],
    });
  });

  it('maps store channel rules and share targets when channel is on', () => {
    const rules: StoreChannelRuleDraftItem[] = [
      {
        id: 'rule_1',
        fieldKeys: ['productPrice', 'productStock'],
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        skuScope: 'allSkus',
        skuKeys: [],
        shareMode: 'product_pool',
        skuConfigs: [
          {
            skuKey: STORE_CHANNEL_SINGLE_SKU_KEY,
            suggestedMinPrice: 260,
            suggestedMaxPrice: 320,
            suggestedMinStock: 12,
            suggestedMaxStock: 42,
          },
        ],
      },
    ];
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
      rules,
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
    expect(result.storeChannelRules).toEqual([
      {
        id: 'rule_1',
        fieldKeys: ['productPrice', 'productStock'],
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        skuScope: 'allSkus',
        skuIds: [],
        shareMode: 'product_pool',
        skuConfigs: [
          {
            skuId: 'sku-product_1-1',
            minSuggestedPrice: 260,
            maxSuggestedPrice: 320,
            minSuggestedStock: 12,
            maxSuggestedStock: 42,
          },
        ],
      },
    ]);
    expect(result.shareTargets).toEqual([
      {
        storeId: 'store_guangzhou',
        status: 'referenced',
        sharedAt: '2026-04-27 10:00:00',
        referencedAt: '2026-04-27 10:00:00',
        sellableSkuIds: ['sku-product_1-1'],
      },
    ]);
  });

  it('uses per-sku source values and per-rule ranges for multi-spec products', () => {
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
      rules: [
        {
          id: 'rule_1',
          fieldKeys: ['productPrice'],
          storeScope: 'allStores',
          storeIds: [],
          skuScope: 'specificSkus',
          skuKeys: ['1'],
          shareMode: 'product_pool',
          skuConfigs: [
            {
              skuKey: '1',
              suggestedMinPrice: 700,
              suggestedMaxPrice: 900,
            },
          ],
        },
        {
          id: 'rule_2',
          fieldKeys: ['productStock'],
          storeScope: 'specificStores',
          storeIds: ['store_shenzhen'],
          skuScope: 'specificSkus',
          skuKeys: ['2'],
          shareMode: 'product_pool',
          skuConfigs: [
            {
              skuKey: '2',
              suggestedMinStock: 15,
              suggestedMaxStock: 30,
            },
          ],
        },
      ],
      targetStoreIds: ['store_guangzhou', 'store_shenzhen'],
      createdAt: '2026-04-27 11:00:00',
    });

    expect(result.skus).toEqual([
      {
        id: 'sku-product_2-1',
        specText: '班级：1v1',
        price: 800,
        stock: 10,
        status: 'on',
      },
      {
        id: 'sku-product_2-2',
        specText: '班级：1v3',
        price: 600,
        stock: 20,
        status: 'on',
      },
    ]);
    expect(result.storeChannelRules).toEqual([
      {
        id: 'rule_1',
        fieldKeys: ['productPrice'],
        storeScope: 'allStores',
        storeIds: [],
        skuScope: 'specificSkus',
        skuIds: ['sku-product_2-1'],
        shareMode: 'product_pool',
        skuConfigs: [
          {
            skuId: 'sku-product_2-1',
            minSuggestedPrice: 700,
            maxSuggestedPrice: 900,
          },
        ],
      },
      {
        id: 'rule_2',
        fieldKeys: ['productStock'],
        storeScope: 'specificStores',
        storeIds: ['store_shenzhen'],
        skuScope: 'specificSkus',
        skuIds: ['sku-product_2-2'],
        shareMode: 'product_pool',
        skuConfigs: [
          {
            skuId: 'sku-product_2-2',
            minSuggestedStock: 15,
            maxSuggestedStock: 30,
          },
        ],
      },
    ]);
    expect(result.shareTargets).toEqual([
      {
        storeId: 'store_guangzhou',
        status: 'referenced',
        sharedAt: '2026-04-27 11:00:00',
        referencedAt: '2026-04-27 11:00:00',
        sellableSkuIds: ['sku-product_2-1'],
      },
      {
        storeId: 'store_shenzhen',
        status: 'referenced',
        sharedAt: '2026-04-27 11:00:00',
        referencedAt: '2026-04-27 11:00:00',
        sellableSkuIds: ['sku-product_2-1', 'sku-product_2-2'],
      },
    ]);
  });

  it('filters stale sku references when specs change', () => {
    const synced = syncStoreChannelRuleDrafts(
      [
        {
          id: 'rule_1',
          fieldKeys: ['productPrice', 'bad_key' as never],
          storeScope: 'specificStores',
          storeIds: ['store_guangzhou', 'store_guangzhou'],
          skuScope: 'specificSkus',
          skuKeys: ['1', '2'],
          shareMode: 'product_pool',
          skuConfigs: [
            {
              skuKey: '1',
              suggestedMinPrice: 100,
              suggestedMinStock: 5,
            },
            {
              skuKey: '2',
              suggestedMinPrice: 200,
              suggestedMinStock: 8,
            },
          ],
        },
      ],
      ['1']
    );

    expect(synced).toEqual([
      {
        id: 'rule_1',
        fieldKeys: ['productPrice'],
        storeScope: 'specificStores',
        storeIds: ['store_guangzhou'],
        skuScope: 'specificSkus',
        skuKeys: ['1'],
        shareMode: 'product_pool',
        skuConfigs: [
          {
            skuKey: '1',
            suggestedMinPrice: 100,
            suggestedMaxPrice: undefined,
            suggestedMinStock: undefined,
            suggestedMaxStock: undefined,
          },
        ],
      },
    ]);
  });

  it('drops hidden price and stock suggestions from submitted rules', () => {
    const result = buildStoreChannelCreateSkuPayload({
      productId: 'product_3',
      specMode: 'single',
      specItems: [],
      storeChannelEnabled: true,
      sourceDraftMap: {
        [STORE_CHANNEL_SINGLE_SKU_KEY]: {
          sourcePrice: 199,
          sourceStock: 30,
        },
      },
      rules: [
        {
          id: 'rule_price_hidden',
          fieldKeys: ['productStock'],
          storeScope: 'allStores',
          storeIds: [],
          skuScope: 'allSkus',
          skuKeys: [],
          shareMode: 'product_pool',
          skuConfigs: [
            {
              skuKey: STORE_CHANNEL_SINGLE_SKU_KEY,
              suggestedMinPrice: 100,
              suggestedMaxPrice: 120,
              suggestedMinStock: 10,
              suggestedMaxStock: 20,
            },
          ],
        },
        {
          id: 'rule_stock_hidden',
          fieldKeys: ['productPrice'],
          storeScope: 'allStores',
          storeIds: [],
          skuScope: 'allSkus',
          skuKeys: [],
          shareMode: 'shared_pool',
          skuConfigs: [
            {
              skuKey: STORE_CHANNEL_SINGLE_SKU_KEY,
              suggestedMinPrice: 160,
              suggestedMaxPrice: 220,
              suggestedMinStock: 8,
              suggestedMaxStock: 18,
            },
          ],
        },
      ],
      targetStoreIds: ['store_guangzhou'],
      createdAt: '2026-04-27 12:00:00',
    });

    expect(result.storeChannelRules).toEqual([
      {
        id: 'rule_price_hidden',
        fieldKeys: ['productStock'],
        storeScope: 'allStores',
        storeIds: [],
        skuScope: 'allSkus',
        skuIds: [],
        shareMode: 'product_pool',
        skuConfigs: [
          {
            skuId: 'sku-product_3-1',
            minSuggestedStock: 10,
            maxSuggestedStock: 20,
          },
        ],
      },
      {
        id: 'rule_stock_hidden',
        fieldKeys: ['productPrice'],
        storeScope: 'allStores',
        storeIds: [],
        skuScope: 'allSkus',
        skuIds: [],
        shareMode: 'shared_pool',
        skuConfigs: [
          {
            skuId: 'sku-product_3-1',
            minSuggestedPrice: 160,
            maxSuggestedPrice: 220,
          },
        ],
      },
    ]);
  });

  it('allows empty custom fields and still validates rule overlaps', () => {
    const sourceDraftMap: StoreChannelSkuDraftMap = {
      '1': {
        sourcePrice: 100,
        sourceStock: 10,
      },
      '2': {
        sourcePrice: 120,
        sourceStock: 12,
      },
    };
    const specItems: StoreChannelSpecItem[] = [
      { id: 1, name: '规格', value: 'A' },
      { id: 2, name: '规格', value: 'B' },
    ];

    expect(
      validateStoreChannelSkuDraftMap({
        specMode: 'multi',
        specItems,
        storeChannelEnabled: true,
        sourceDraftMap,
        targetStoreIds: ['store_guangzhou'],
        rules: [
          {
            id: 'rule_1',
            fieldKeys: [],
            storeScope: 'allStores',
            storeIds: [],
            skuScope: 'allSkus',
            skuKeys: [],
            shareMode: 'product_pool',
            skuConfigs: [],
          },
        ],
      })
    ).toBeUndefined();

    expect(() =>
      validateStoreChannelSkuDraftMap({
        specMode: 'multi',
        specItems,
        storeChannelEnabled: true,
        sourceDraftMap,
        targetStoreIds: ['store_guangzhou'],
        rules: [
          {
            id: 'rule_1',
            fieldKeys: ['productPrice'],
            storeScope: 'specificStores',
            storeIds: ['store_guangzhou'],
            skuScope: 'specificSkus',
            skuKeys: ['1'],
            shareMode: 'product_pool',
            skuConfigs: [],
          },
          {
            id: 'rule_2',
            fieldKeys: ['productStock'],
            storeScope: 'specificStores',
            storeIds: ['store_guangzhou'],
            skuScope: 'specificSkus',
            skuKeys: ['1'],
            shareMode: 'product_pool',
            skuConfigs: [],
          },
        ],
      })
    ).toThrow('同一店铺下的同一 SKU 不能命中多条规则');
  });
});
