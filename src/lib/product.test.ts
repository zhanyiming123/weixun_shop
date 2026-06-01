import { describe, expect, it } from 'vitest';
import {
  buildProductListItem,
  applyBundleRuntime,
  getProductCurrentComboOptions,
  getProductCurrentSkus,
  getProductIndependentStockRule,
  getProductShareModeLabel,
  getProductStoreChannelConfig,
  markShareTargetReferenced,
  normalizeProductKind,
  normalizeProductIndependentStockRule,
  normalizeProductComboOptions,
  normalizeProductShareTargets,
  normalizeProductStoreComboOptionItemOverrides,
  normalizeProductStoreLocalSkuItems,
  normalizeProductStoreChannelConfig,
  resolveBundleAvailability,
  shouldShowSalesStoreAction,
  syncReferencedStoreConfigsBySourceSellStatus,
  upsertPendingShareTargets,
} from '@/lib/product';
import type { ProductItem } from '@/types/product';

function createBaseProduct(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: 'product-1',
    name: '测试商品',
    productKind: 'standard',
    productCatalogId: 'catalog_1',
    productOwnershipId: 'ownership_1',
    productType: 'virtual',
    inventoryUnit: '份',
    specMode: 'single',
    skus: [
      {
        id: 'sku-1',
        specText: '',
        price: 100,
        stock: 20,
        status: 'on',
      },
    ],
    status: 'off',
    price: 100,
    stock: 20,
    createdAt: '2026-04-23 10:00:00',
    sourceType: 'store',
    sourceStoreId: 'store_source',
    storeConfigs: [
      {
        storeId: 'store_source',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
    storeOverrides: {},
    independentPriceRule: {
      enabled: true,
      skuRules: [],
    },
    ...overrides,
  };
}

describe('product domain rules', () => {
  it('normalizes legacy product kind to standard', () => {
    expect(normalizeProductKind(undefined)).toBe('standard');
    expect(normalizeProductKind('bundle')).toBe('bundle');
  });

  it('handles share target pending -> referenced flow', () => {
    const base = createBaseProduct({
      shareTargets: [],
    });
    const shared = upsertPendingShareTargets(base, ['store_target'], '2026-04-23 11:00:00');
    expect(shared.shareTargets?.[0]?.status).toBe('pending');

    const referenced = markShareTargetReferenced(shared, 'store_target', '2026-04-23 11:05:00');
    expect(referenced.shareTargets?.[0]?.status).toBe('referenced');
    expect(referenced.shareTargets?.[0]?.referencedAt).toBe('2026-04-23 11:05:00');
  });

  it('normalizes share target sellable sku ids', () => {
    const normalized = normalizeProductShareTargets([
      {
        storeId: '  store_target  ',
        status: 'pending',
        sharedAt: ' 2026-04-23 10:00:00 ',
        referencedAt: ' 2026-04-23 11:00:00 ',
        sellableSkuIds: [' sku-1 ', 'sku-1', ' ', 'sku-2'] as unknown as string[],
        allowSelfPrice: true,
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      storeId: 'store_target',
      status: 'pending',
      sharedAt: '2026-04-23 10:00:00',
      referencedAt: undefined,
      sellableSkuIds: ['sku-1', 'sku-2'],
      allowSelfPrice: true,
    });
  });

  it('normalizes independent stock rules and filters invalid values', () => {
    const normalized = normalizeProductIndependentStockRule(
      {
        enabled: true,
        skuRules: [
          {
            skuId: ' sku-1 ',
            minStock: 3.8,
            maxStock: 12.2,
          },
          {
            skuId: 'sku-1',
            minStock: 99,
            maxStock: 100,
          },
          {
            skuId: 'sku-2',
            minStock: 8,
            maxStock: 4,
          },
          {
            skuId: 'sku-3',
            minStock: 1,
            maxStock: 2,
          },
        ],
      },
      [{ id: 'sku-1' }, { id: 'sku-2' }]
    );

    expect(normalized).toEqual({
      enabled: true,
      skuRules: [
        {
          skuId: 'sku-1',
          minStock: 3,
          maxStock: 12,
        },
      ],
    });
  });

  it('normalizes combo options and removes invalid or duplicated sku items', () => {
    const normalized = normalizeProductComboOptions([
      {
        id: ' option_1 ',
        title: ' 必选主项 ',
        required: true,
        selectionLimit: 3.8,
        items: [
          {
            productId: ' product_1 ',
            skuId: ' sku_1 ',
            comboPrice: 199.5,
            quantity: 2.7,
            required: true,
            listed: true,
          },
          {
            productId: 'product_1',
            skuId: 'sku_1',
            comboPrice: 88,
            quantity: 1,
            required: false,
            listed: true,
          },
          {
            productId: 'product_2',
            skuId: 'sku_2',
            comboPrice: -20,
            quantity: -3,
            required: false,
            listed: true,
          },
        ],
      },
      {
        id: 'option_2',
        title: '  ',
        required: false,
        selectionLimit: 2,
        items: [
          {
            productId: 'product_3',
            skuId: 'sku_3',
            comboPrice: 99,
            quantity: 1,
            required: true,
            listed: true,
          },
        ],
      },
      {
        id: '',
        title: '加购项',
        required: false,
        selectionLimit: 10,
        items: [
          {
            productId: 'product_2',
            skuId: 'sku_2',
            comboPrice: 59,
            quantity: 1,
            required: false,
            listed: true,
          },
          {
            productId: 'product_4',
            skuId: 'sku_4',
            comboPrice: 39,
            quantity: 0,
            required: false,
            listed: true,
          },
        ],
      },
    ]);

    expect(normalized).toEqual([
      {
        id: 'option_1',
        title: '必选主项',
        optionType: 'selective',
        required: true,
        selectionLimit: 2,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            comboPrice: 199.5,
            quantity: 2,
            required: false,
            listed: true,
          },
          {
            productId: 'product_2',
            skuId: 'sku_2',
            comboPrice: 0,
            quantity: 1,
            required: false,
            listed: true,
          },
        ],
      },
      {
        id: 'option_3',
        title: '加购项',
        optionType: 'add_on',
        required: false,
        selectionLimit: 1,
        items: [
          {
            productId: 'product_4',
            skuId: 'sku_4',
            comboPrice: 39,
            quantity: 1,
            required: false,
            listed: true,
          },
        ],
      },
    ]);
  });

  it('normalizes combo option item overrides and filters invalid items', () => {
    const normalized = normalizeProductStoreComboOptionItemOverrides(
      [
        {
          optionId: ' option_1 ',
          skuId: ' sku_1 ',
          currentComboPrice: 88,
          currentListed: false,
          currentDefaultSelected: false,
        },
        {
          optionId: 'option_1',
          skuId: 'sku_1',
          currentComboPrice: 99,
          currentListed: true,
          currentDefaultSelected: true,
        },
        {
          optionId: 'option_missing',
          skuId: 'sku_2',
          currentComboPrice: 77,
          currentListed: true,
          currentDefaultSelected: false,
        },
        {
          optionId: 'option_2',
          skuId: 'sku_missing',
          currentComboPrice: 66,
          currentListed: false,
          currentDefaultSelected: false,
        },
      ],
      [
        {
          id: 'option_1',
          title: '选项1',
          optionType: 'selective',
          required: true,
          selectionLimit: 1,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: false,
              listed: true,
            },
          ],
        },
      ]
    );

    expect(normalized).toEqual([
      {
        optionId: 'option_1',
        skuId: 'sku_1',
        currentComboPrice: 99,
        currentListed: true,
        currentDefaultSelected: true,
      },
    ]);
  });

  it('resolves SKU price/stock overrides for target store while deriving display status from sell status', () => {
    const product = createBaseProduct({
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'independent',
          stockMode: 'independent',
          currentPrice: 88,
          skuPriceOverrides: [{ skuId: 'sku-1', currentPrice: 88 }],
          skuStockOverrides: [{ skuId: 'sku-1', currentStock: 8 }],
          skuStatusOverrides: [{ skuId: 'sku-1', currentStatus: 'off' }],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });

    const currentSku = getProductCurrentSkus(product, 'store_target')[0];
    expect(currentSku.currentPrice).toBe(88);
    expect(currentSku.currentStock).toBe(8);
    expect(currentSku.currentStatus).toBe('on');
  });

  it('keeps store sell status and channel status separate in list items', () => {
    const product = createBaseProduct({
      sourceStoreId: 'store_target',
      storeConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'unsellable',
          channelStatus: 'on',
        },
      ],
    });

    const item = buildProductListItem(product, 'store', ['store_target']);

    expect(item.storeView.currentStoreSellStatus).toBe('unsellable');
    expect(item.storeView.currentStoreChannelStatus).toBe('on');
  });

  it('normalizes local sku items and filters duplicates and collisions', () => {
    expect(
      normalizeProductStoreLocalSkuItems(
        [
          {
            skuId: ' local-1 ',
            specText: ' 红色 ',
            price: 88.25,
            stock: 5.9,
            sellStatus: 'sellable',
            status: 'on',
          },
          {
            skuId: 'local-2',
            specText: '红色',
            price: 90,
            stock: 3,
            sellStatus: 'unsellable',
            status: 'off',
          },
          {
            skuId: 'sku-1',
            specText: '绿色',
            price: 92,
            stock: 2,
            sellStatus: 'sellable',
            status: 'on',
          },
          {
            skuId: 'local-3',
            specText: '蓝色',
            price: -1,
            stock: 1,
            sellStatus: 'sellable',
            status: 'on',
          },
          {
            skuId: 'local-4',
            specText: '白色',
            price: 100,
            stock: 4,
            sellStatus: 'unsellable',
            status: 'off',
          },
        ],
        [
          { id: 'sku-1', specText: '绿色' },
          { id: 'sku-2', specText: '蓝色' },
        ]
      )
    ).toEqual([
      {
        skuId: 'local-1',
        specText: '红色',
        price: 88.25,
        stock: 5,
        sellStatus: 'sellable',
        status: 'on',
      },
      {
        skuId: 'local-4',
        specText: '白色',
        price: 100,
        stock: 4,
        sellStatus: 'unsellable',
        status: 'off',
      },
    ]);
  });

  it('preserves local sku image and a single default-selected flag when normalizing', () => {
    expect(
      normalizeProductStoreLocalSkuItems([
        {
          skuId: 'local-1',
          specText: '红色',
          price: 88.25,
          stock: 5,
          sellStatus: 'sellable',
          status: 'on',
          image: {
            id: ' image_1 ',
            name: ' 红色图 ',
            url: ' https://example.com/red.png ',
          },
          isDefaultSelected: true,
        },
        {
          skuId: 'local-2',
          specText: '蓝色',
          price: 90,
          stock: 3,
          sellStatus: 'sellable',
          status: 'on',
          isDefaultSelected: true,
        },
      ])
    ).toEqual([
      {
        skuId: 'local-1',
        specText: '红色',
        price: 88.25,
        stock: 5,
        sellStatus: 'sellable',
        status: 'on',
        image: {
          id: 'image_1',
          name: '红色图',
          url: 'https://example.com/red.png',
        },
        isDefaultSelected: true,
      },
      {
        skuId: 'local-2',
        specText: '蓝色',
        price: 90,
        stock: 3,
        sellStatus: 'sellable',
        status: 'on',
      },
    ]);
  });

  it('includes local sku items in current sku view and product summary', () => {
    const product = createBaseProduct({
      specMode: 'multi',
      skus: [
        {
          id: 'sku-1',
          specText: '黑色',
          price: 100,
          stock: 10,
          status: 'on',
        },
        {
          id: 'sku-2',
          specText: '白色',
          price: 120,
          stock: 8,
          status: 'on',
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'follow',
          stockMode: 'follow',
          skuPriceOverrides: [],
          skuStockOverrides: [],
          skuSellStatusOverrides: [],
          skuStatusOverrides: [],
          localSkuItems: [
            {
              skuId: 'local-1',
              specText: '红色',
              price: 90,
              stock: 4,
              sellStatus: 'sellable',
              status: 'on',
              image: {
                id: 'image_1',
                name: '红色图',
                url: 'https://example.com/red.png',
              },
              isDefaultSelected: true,
            },
          ],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });

    const currentSkus = getProductCurrentSkus(product, 'store_target');
    const listItem = buildProductListItem(product, 'store', ['store_target'], {
      resolvedSourceStoreId: 'store_source',
      sourceStoreName: '源店铺',
      sourceRegionName: '华东',
      salesStatusCounts: {
        selling: 1,
        off: 0,
      },
    });

    expect(currentSkus).toHaveLength(3);
    expect(currentSkus.find((item) => item.isLocalSku)).toMatchObject({
      id: 'local-1',
      specText: '红色',
      currentPrice: 90,
      currentStock: 4,
      currentSellStatus: 'sellable',
      currentStatus: 'on',
      image: {
        id: 'image_1',
        name: '红色图',
        url: 'https://example.com/red.png',
      },
      isDefaultSelected: true,
      isLocalSku: true,
    });
    expect(listItem.stock).toBe(22);
    expect(listItem.storeView.currentPrice).toBe(90);
    expect(listItem.storeView.currentSkus).toHaveLength(3);
  });

  it('allows shared stores with allowSelfPrice to manage independent price without legacy price rules', () => {
    const product = createBaseProduct({
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:00:00',
          referencedAt: '2026-04-23 10:05:00',
          sellableSkuIds: ['sku-1'],
          allowSelfPrice: true,
        },
      ],
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'independent',
          stockMode: 'follow',
          currentPrice: 88,
          skuPriceOverrides: [{ skuId: 'sku-1', currentPrice: 88 }],
          skuStockOverrides: [],
          skuStatusOverrides: [],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });

    const listItem = buildProductListItem(product, 'store', ['store_target'], {
      resolvedSourceStoreId: 'store_source',
      sourceStoreName: '源店铺',
      sourceRegionName: '华东',
      salesStatusCounts: {
        selling: 1,
        off: 0,
      },
    });

    expect(listItem.storeView.canManageIndependentPrice).toBe(true);
    expect(listItem.storeView.priceMode).toBe('independent');
    expect(listItem.storeView.currentPrice).toBe(88);
  });

  it('keeps shared stores without allowSelfPrice on follow price when legacy price rules are disabled', () => {
    const product = createBaseProduct({
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:00:00',
          referencedAt: '2026-04-23 10:05:00',
          sellableSkuIds: ['sku-1'],
        },
      ],
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'independent',
          stockMode: 'follow',
          currentPrice: 88,
          skuPriceOverrides: [{ skuId: 'sku-1', currentPrice: 88 }],
          skuStockOverrides: [],
          skuStatusOverrides: [],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });

    const listItem = buildProductListItem(product, 'store', ['store_target'], {
      resolvedSourceStoreId: 'store_source',
      sourceStoreName: '源店铺',
      sourceRegionName: '华东',
      salesStatusCounts: {
        selling: 1,
        off: 0,
      },
    });

    expect(listItem.storeView.canManageIndependentPrice).toBe(false);
    expect(listItem.storeView.priceMode).toBe('follow');
    expect(listItem.storeView.currentPrice).toBe(100);
  });

  it('builds product list item with combo option overrides merged into current combo options', () => {
    const product = createBaseProduct({
      productKind: 'combo',
      comboOptions: [
        {
          id: 'option_1',
          title: '主课',
          optionType: 'selective',
          required: true,
          selectionLimit: 1,
          items: [
            {
              productId: 'child_1',
              skuId: 'sku_child_1',
              comboPrice: 699,
              quantity: 1,
              required: false,
              listed: true,
              defaultSelected: true,
            },
            {
              productId: 'child_2',
              skuId: 'sku_child_2',
              comboPrice: 899,
              quantity: 2,
              required: false,
              listed: true,
            },
          ],
        },
      ],
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:10:00',
          referencedAt: '2026-04-23 10:20:00',
        },
      ],
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'follow',
          stockMode: 'follow',
          currentPrice: undefined,
          skuPriceOverrides: [],
          skuStockOverrides: [],
          skuSellStatusOverrides: [],
          skuStatusOverrides: [],
          comboOptionItemOverrides: [
            {
              optionId: 'option_1',
              skuId: 'sku_child_2',
              currentComboPrice: 799,
              currentListed: false,
              currentDefaultSelected: false,
            },
          ],
          localSkuItems: [],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });

    const currentComboOptions = getProductCurrentComboOptions(product, 'store_target');
    const listItem = buildProductListItem(product, 'store', ['store_target'], {
      resolvedSourceStoreId: 'store_source',
      sourceStoreName: '源店铺',
      sourceRegionName: '华东',
      salesStatusCounts: {
        selling: 1,
        off: 0,
      },
    });

    expect(currentComboOptions).toEqual([
      {
        id: 'option_1',
        title: '主课',
        optionType: 'selective',
        required: true,
        selectionLimit: 1,
        items: [
          {
            productId: 'child_1',
            skuId: 'sku_child_1',
            productName: 'child_1',
            specText: '默认规格',
            originalPrice: 699,
            comboPrice: 699,
            quantity: 1,
            required: false,
            listed: true,
            defaultSelected: true,
          },
          {
            productId: 'child_2',
            skuId: 'sku_child_2',
            productName: 'child_2',
            specText: '默认规格',
            originalPrice: 899,
            comboPrice: 799,
            quantity: 2,
            required: false,
            listed: false,
            defaultSelected: false,
          },
        ],
      },
    ]);
    expect(listItem.storeView.originalComboOptions).toEqual([
      {
        id: 'option_1',
        title: '主课',
        optionType: 'selective',
        required: true,
        selectionLimit: 1,
        items: [
          {
            productId: 'child_1',
            skuId: 'sku_child_1',
            productName: 'child_1',
            specText: '默认规格',
            originalPrice: 699,
            comboPrice: 699,
            quantity: 1,
            required: false,
            listed: true,
            defaultSelected: true,
          },
          {
            productId: 'child_2',
            skuId: 'sku_child_2',
            productName: 'child_2',
            specText: '默认规格',
            originalPrice: 899,
            comboPrice: 899,
            quantity: 2,
            required: false,
            listed: true,
          },
        ],
      },
    ]);
    expect(listItem.storeView.currentComboOptions).toEqual(currentComboOptions);
  });

  it('builds share mode label for list items and hides sales-store action for shared-pool self-built products', () => {
    const product = createBaseProduct({
      storeChannelConfig: {
        shareMode: 'shared_pool',
        storeScope: 'specificStores',
        storeIds: ['store_target'],
        productPoolStoreConfigs: [],
      },
    });

    const listItem = buildProductListItem(product, 'store', ['store_source'], {
      resolvedSourceStoreId: 'store_source',
      sourceStoreName: '源店铺',
      sourceRegionName: '华东',
    });

    expect(getProductShareModeLabel(product)).toBe('商品共享池');
    expect(listItem.storeView.isSelfBuilt).toBe(true);
    expect(shouldShowSalesStoreAction(listItem)).toBe(false);
  });

  it('keeps sales-store action for self-built product-pool products', () => {
    const product = createBaseProduct({
      storeChannelConfig: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_target'],
        productPoolStoreConfigs: [],
      },
    });

    const listItem = buildProductListItem(product, 'store', ['store_source'], {
      resolvedSourceStoreId: 'store_source',
      sourceStoreName: '源店铺',
      sourceRegionName: '华东',
    });

    expect(shouldShowSalesStoreAction(listItem)).toBe(true);
  });

  it('exposes product independent stock rule through helper', () => {
    const product = createBaseProduct({
      independentStockRule: {
        enabled: true,
        skuRules: [
          {
            skuId: 'sku-1',
            minStock: 6,
            maxStock: 18,
          },
        ],
      },
    });

    expect(getProductIndependentStockRule(product)).toEqual({
      enabled: true,
      skuRules: [
        {
          skuId: 'sku-1',
          minStock: 6,
          maxStock: 18,
        },
      ],
    });
  });

  it('normalizes single store channel config and filters invalid values', () => {
    expect(
      normalizeProductStoreChannelConfig(
        {
          shareMode: 'shared_pool',
          storeScope: 'specificStores',
          storeIds: [' store_target ', 'store_target', 'store_missing'],
          productPoolStoreConfigs: [
            {
              storeId: 'store_target',
              sellStatus: 'sellable',
              sellableSkuIds: [' sku-1 ', 'sku-1', 'sku-3'],
              allowSelfPrice: true,
            },
            {
              storeId: 'store_target',
              sellStatus: 'sellable',
              sellableSkuIds: ['sku-2'],
            },
          ],
        },
        undefined,
        [],
        [{ id: 'sku-1' }, { id: 'sku-2' }],
        ['store_target']
      )
    ).toEqual({
      shareMode: 'shared_pool',
      storeScope: 'specificStores',
      storeIds: ['store_target'],
      productPoolStoreConfigs: [],
    });
  });

  it('uses independent ranges when store channel config no longer carries sku suggestions', () => {
    const product = createBaseProduct({
      skus: [
        {
          id: 'sku-1',
          specText: '',
          price: 100,
          stock: 20,
          status: 'on',
        },
        {
          id: 'sku-2',
          specText: '扩展包',
          price: 120,
          stock: 8,
          status: 'on',
        },
      ],
      independentPriceRule: {
        enabled: true,
        skuRules: [
          {
            skuId: 'sku-1',
            minPrice: 88,
            maxPrice: 118,
          },
          {
            skuId: 'sku-2',
            minPrice: 70,
            maxPrice: 130,
          },
        ],
      },
      independentStockRule: {
        enabled: true,
        skuRules: [
          {
            skuId: 'sku-1',
            minStock: 6,
            maxStock: 18,
          },
          {
            skuId: 'sku-2',
            minStock: 2,
            maxStock: 10,
          },
        ],
      },
      storeChannelConfig: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: ['store_target'],
        productPoolStoreConfigs: [
          {
            storeId: 'store_target',
            sellStatus: 'sellable',
            sellableSkuIds: ['sku-1', 'sku-2'],
          },
        ],
      },
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:00:00',
          referencedAt: '2026-04-23 10:05:00',
          sellableSkuIds: ['sku-1', 'sku-2'],
        },
      ],
    });

    const currentSkus = getProductCurrentSkus(product, 'store_target');

    expect(currentSkus[0].minIndependentPrice).toBe(88);
    expect(currentSkus[0].maxIndependentPrice).toBe(118);
    expect(currentSkus[0].minIndependentStock).toBe(6);
    expect(currentSkus[0].maxIndependentStock).toBe(18);
    expect(currentSkus[1].minIndependentPrice).toBe(70);
    expect(currentSkus[1].maxIndependentPrice).toBe(130);
    expect(currentSkus[1].minIndependentStock).toBe(2);
    expect(currentSkus[1].maxIndependentStock).toBe(10);
  });

  it('exposes normalized store channel config through helper and falls back to legacy rules', () => {
    const product = createBaseProduct({
      storeChannelRules: [
        {
          id: 'rule_1',
          fieldKeys: ['productPrice'],
          storeScope: 'allStores',
          storeIds: ['store_target'],
          skuScope: 'allSkus',
          skuIds: ['sku-1'],
          shareMode: 'product_pool',
          skuConfigs: [],
        },
      ],
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:00:00',
          referencedAt: '2026-04-23 10:05:00',
          sellableSkuIds: ['sku-1'],
          allowSelfPrice: true,
        },
      ],
    });

    expect(getProductStoreChannelConfig(product)).toEqual({
      shareMode: 'product_pool',
      storeScope: 'specificStores',
      storeIds: ['store_target'],
      productPoolStoreConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuIds: ['sku-1'],
          allowSelfPrice: true,
        },
      ],
    });
  });

  it('follows source stock and ignores store-specific sku status overrides when stock mode is follow', () => {
    const product = createBaseProduct({
      skus: [
        {
          id: 'sku-1',
          specText: '',
          price: 100,
          stock: 20,
          status: 'off',
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'follow',
          stockMode: 'follow',
          skuPriceOverrides: [],
          skuStockOverrides: [{ skuId: 'sku-1', currentStock: 8 }],
          skuStatusOverrides: [{ skuId: 'sku-1', currentStatus: 'on' }],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });

    const currentSku = getProductCurrentSkus(product, 'store_target')[0];
    expect(currentSku.currentStock).toBe(20);
    expect(currentSku.currentStatus).toBe('off');
  });

  it('treats non-sellable shared sku as unsellable before local overrides', () => {
    const product = createBaseProduct({
      skus: [
        {
          id: 'sku-1',
          specText: '',
          price: 100,
          stock: 20,
          status: 'on',
        },
        {
          id: 'sku-2',
          specText: '扩展包',
          price: 120,
          stock: 8,
          status: 'on',
        },
      ],
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:00:00',
          referencedAt: '2026-04-23 10:10:00',
          sellableSkuIds: ['sku-1'],
        },
      ],
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
    });

    const currentSku = getProductCurrentSkus(product, 'store_target').find(
      (item) => item.id === 'sku-2'
    );

    expect(currentSku?.currentSellStatus).toBe('unsellable');
    expect(currentSku?.currentStatus).toBe('off');
  });

  it('propagates source sell status changes to referenced stores', () => {
    const previous = createBaseProduct({
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
      ],
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 10:00:00',
          referencedAt: '2026-04-23 10:10:00',
        },
      ],
    });

    const nextUnsellable = syncReferencedStoreConfigsBySourceSellStatus(previous, {
      ...previous,
      storeConfigs: previous.storeConfigs.map((item) =>
        item.storeId === 'store_source'
          ? {
              ...item,
              sellStatus: 'unsellable',
              channelStatus: 'off',
            }
          : item
      ),
    });
    const targetUnsellable = nextUnsellable.storeConfigs.find(
      (item) => item.storeId === 'store_target'
    );
    expect(targetUnsellable?.sellStatus).toBe('unsellable');
    expect(targetUnsellable?.channelStatus).toBe('off');

    const recovered = syncReferencedStoreConfigsBySourceSellStatus(nextUnsellable, {
      ...nextUnsellable,
      storeConfigs: nextUnsellable.storeConfigs.map((item) =>
        item.storeId === 'store_source'
          ? {
              ...item,
              sellStatus: 'sellable',
              channelStatus: 'on',
            }
          : item
      ),
    });
    const targetRecovered = recovered.storeConfigs.find(
      (item) => item.storeId === 'store_target'
    );
    expect(targetRecovered?.sellStatus).toBe('sellable');
    expect(targetRecovered?.channelStatus).toBe('on');
  });

  it('calculates bundle stock by min component stock and links component availability', () => {
    const componentA = createBaseProduct({
      id: 'component-A',
      sourceStoreId: 'store_source',
      skus: [
        {
          id: 'sku-A',
          specText: 'A',
          price: 50,
          stock: 6,
          status: 'on',
        },
      ],
      stock: 6,
    });
    const componentB = createBaseProduct({
      id: 'component-B',
      sourceStoreId: 'store_source',
      skus: [
        {
          id: 'sku-B',
          specText: 'B',
          price: 60,
          stock: 12,
          status: 'on',
        },
      ],
      stock: 12,
    });
    const bundle = createBaseProduct({
      id: 'bundle-1',
      productKind: 'bundle',
      skus: [
        {
          id: 'bundle-sku',
          specText: 'A+B',
          price: 99,
          stock: 0,
          status: 'on',
        },
      ],
      bundleComponents: [
        { productId: 'component-A', skuId: 'sku-A' },
        { productId: 'component-B', skuId: 'sku-B' },
      ],
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
      ],
    });

    const availability = resolveBundleAvailability(bundle, [componentA, componentB, bundle]);
    expect(availability.stock).toBe(6);
    expect(availability.sellable).toBe(true);

    const offComponentB = {
      ...componentB,
      skus: [{ ...componentB.skus[0], status: 'off' as const }],
    };
    const runtimeBundle = applyBundleRuntime(bundle, [componentA, offComponentB, bundle]);
    expect(runtimeBundle.skus[0].status).toBe('off');
    expect(runtimeBundle.storeConfigs[0].sellStatus).toBe('unsellable');
  });
});
