import { describe, expect, it, vi } from 'vitest';
import { ProductService } from '@/services/ProductService';
import type { ProductFilterValues, ProductItem } from '@/types/product';

function createShareProduct(overrides: Partial<ProductItem> = {}): ProductItem {
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
        status: 'on',
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
    shareTargets: [
      {
        storeId: 'store_target',
        status: 'pending',
        sharedAt: '2026-04-23 12:30:00',
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

function createListFilters(
  overrides: Partial<ProductFilterValues> = {}
): ProductFilterValues {
  return {
    searchType: 'productName',
    keyword: '',
    sellStatus: undefined,
    productCatalogId: undefined,
    productOwnershipId: undefined,
    productSourceType: undefined,
    sourceStoreIds: [],
    minPrice: undefined,
    maxPrice: undefined,
    createdAtRange: [],
    ...overrides,
  };
}

function createSharePoolFilterProducts(): ProductItem[] {
  return [
    {
      id: 'pool_standard_1',
      name: '苹果单品',
      productKind: 'standard',
      productCatalogId: 'international',
      productOwnershipId: 'item_06_02_01',
      productType: 'virtual',
      inventoryUnit: '份',
      specMode: 'single',
      skus: [
        {
          id: 'sku_a_1',
          specText: '',
          price: 100,
          stock: 50,
          status: 'on',
        },
      ],
      status: 'on',
      price: 100,
      stock: 50,
      createdAt: '2026-04-10 10:00:00',
      sourceType: 'store',
      sourceStoreId: 'store_suzhou',
      storeConfigs: [
        {
          storeId: 'store_suzhou',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
      shareTargets: [
        {
          storeId: 'store_guangzhou',
          status: 'pending',
          sharedAt: '2026-04-20 10:00:00',
        },
      ],
      independentPriceRule: {
        enabled: true,
        skuRules: [
          {
            skuId: 'sku_a_1',
            minPrice: 90,
            maxPrice: 130,
          },
        ],
      },
    },
    {
      id: 'pool_bundle_1',
      name: '早餐套餐',
      productKind: 'bundle',
      productCatalogId: 'service',
      productOwnershipId: 'item_03_03_07',
      productType: 'service',
      inventoryUnit: '套',
      specMode: 'single',
      skus: [
        {
          id: 'sku_b_1',
          specText: '',
          price: 180,
          stock: 20,
          status: 'on',
        },
      ],
      status: 'on',
      price: 180,
      stock: 20,
      createdAt: '2026-04-12 11:00:00',
      sourceType: 'store',
      sourceStoreId: 'store_shenzhen',
      storeConfigs: [
        {
          storeId: 'store_shenzhen',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
      bundleComponents: [
        {
          productId: 'pool_standard_1',
          skuId: 'sku_a_1',
        },
      ],
      shareTargets: [
        {
          storeId: 'store_guangzhou',
          status: 'pending',
          sharedAt: '2026-04-21 10:00:00',
        },
      ],
    },
    {
      id: 'pool_standard_2',
      name: '橙子单品',
      productKind: 'standard',
      productCatalogId: 'international',
      productOwnershipId: 'item_06_02_01',
      productType: 'virtual',
      inventoryUnit: '份',
      specMode: 'single',
      skus: [
        {
          id: 'sku_c_1',
          specText: '',
          price: 220,
          stock: 16,
          status: 'on',
        },
      ],
      status: 'on',
      price: 220,
      stock: 16,
      createdAt: '2026-03-15 09:30:00',
      sourceType: 'store',
      sourceStoreId: 'store_suzhou',
      storeConfigs: [
        {
          storeId: 'store_suzhou',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_guangzhou',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
      shareTargets: [
        {
          storeId: 'store_guangzhou',
          status: 'referenced',
          sharedAt: '2026-04-22 09:00:00',
          referencedAt: '2026-04-22 09:20:00',
        },
      ],
    },
  ];
}

describe('ProductService reference shared product', () => {
  it('applies sku status overrides from share target sellable sku ids', async () => {
    const product = createShareProduct({
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'pending',
          sharedAt: '2026-04-23 12:30:00',
          sellableSkuIds: ['sku_1'],
        },
      ],
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.referenceSharedProduct({
      productId: 'product_1',
      storeId: 'store_target',
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedProduct = savedProducts[0];
    const target = (savedProduct.shareTargets || []).find(
      (item) => item.storeId === 'store_target'
    );

    expect(target?.status).toBe('referenced');
    expect(target?.referencedAt).toBeTruthy();
    expect(savedProduct.storeOverrides?.store_target?.skuSellStatusOverrides).toEqual([
      {
        skuId: 'sku_2',
        currentSellStatus: 'unsellable',
      },
    ]);
    expect(savedProduct.storeOverrides?.store_target?.skuStatusOverrides).toEqual([
      {
        skuId: 'sku_2',
        currentStatus: 'off',
      },
    ]);
  });

  it('treats legacy share target without sellable sku ids as all sku sellable', async () => {
    const product = createShareProduct({
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'pending',
          sharedAt: '2026-04-23 12:30:00',
        },
      ],
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.referenceSharedProduct({
      productId: 'product_1',
      storeId: 'store_target',
    });

    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedProduct = savedProducts[0];

    expect(savedProduct.storeOverrides?.store_target?.skuSellStatusOverrides || []).toHaveLength(0);
    expect(savedProduct.storeOverrides?.store_target?.skuStatusOverrides || []).toHaveLength(0);
  });

  it('supports cancel reference and restores pending status with unsellable store config', async () => {
    const product = createShareProduct({
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 12:30:00',
          referencedAt: '2026-04-23 12:40:00',
          sellableSkuIds: ['sku_1'],
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
          channelStatus: 'on',
        },
      ],
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.cancelReferenceSharedProduct({
      productId: 'product_1',
      storeId: 'store_target',
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedProduct = savedProducts[0];
    const target = (savedProduct.shareTargets || []).find(
      (item) => item.storeId === 'store_target'
    );
    const targetStoreConfig = (savedProduct.storeConfigs || []).find(
      (item) => item.storeId === 'store_target'
    );

    expect(target?.status).toBe('pending');
    expect(target?.referencedAt).toBeUndefined();
    expect(targetStoreConfig?.sellStatus).toBe('unsellable');
    expect(targetStoreConfig?.channelStatus).toBe('off');
  });
});

describe('ProductService store overrides', () => {
  it('clears stock overrides when stock mode follows source', async () => {
    const product = createShareProduct({
      specMode: 'single',
      skus: [
        {
          id: 'sku_1',
          specText: '',
          price: 100,
          stock: 10,
          status: 'on',
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'follow',
          stockMode: 'independent',
          currentPrice: undefined,
          skuPriceOverrides: [],
          skuStockOverrides: [{ skuId: 'sku_1', currentStock: 6 }],
          skuStatusOverrides: [{ skuId: 'sku_1', currentStatus: 'off' }],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductStoreOverride({
      productId: 'product_1',
      storeId: 'store_target',
      priceMode: 'follow',
      stockMode: 'follow',
      skuPriceOverrides: [],
      skuStockOverrides: [{ skuId: 'sku_1', currentStock: 4 }],
      skuStatusOverrides: [{ skuId: 'sku_1', currentStatus: 'off' }],
      nameMode: 'follow',
      carouselMode: 'follow',
      overrideCarouselImages: [],
    });

    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedOverride = savedProducts[0].storeOverrides?.store_target;

    expect(savedOverride?.stockMode).toBe('follow');
    expect(savedOverride?.skuStockOverrides).toEqual([]);
    expect(savedOverride?.skuStatusOverrides).toEqual([
      {
        skuId: 'sku_1',
        currentStatus: 'off',
      },
    ]);
  });

  it('persists local sku items when saving store overrides', async () => {
    const product = createShareProduct({
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
          status: 'on',
        },
      ],
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductStoreOverride({
      productId: 'product_1',
      storeId: 'store_target',
      priceMode: 'independent',
      stockMode: 'follow',
      skuPriceOverrides: [
        {
          skuId: 'sku_1',
          currentPrice: 100,
        },
        {
          skuId: 'sku_2',
          currentPrice: 120,
        },
      ],
      skuStockOverrides: [],
      skuStatusOverrides: [],
      localSkuItems: [
        {
          skuId: 'local_1',
          specText: '红色',
          price: 90,
          stock: 4.7,
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
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedOverride = savedProducts[0].storeOverrides?.store_target;

    expect(savedOverride?.currentPrice).toBe(90);
    expect(savedOverride?.localSkuItems).toEqual([
      {
        skuId: 'local_1',
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
    ]);
  });

  it('allows shared stores with allowSelfPrice to save independent prices without legacy price ranges', async () => {
    const product = createShareProduct({
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 12:30:00',
          referencedAt: '2026-04-23 12:40:00',
          sellableSkuIds: ['sku_1', 'sku_2'],
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
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductStoreOverride({
      productId: 'product_1',
      storeId: 'store_target',
      priceMode: 'independent',
      stockMode: 'follow',
      skuPriceOverrides: [
        {
          skuId: 'sku_1',
          currentPrice: 88,
        },
        {
          skuId: 'sku_2',
          currentPrice: 118,
        },
      ],
      skuStockOverrides: [],
      skuStatusOverrides: [],
      nameMode: 'follow',
      carouselMode: 'follow',
      overrideCarouselImages: [],
    });

    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedOverride = savedProducts[0].storeOverrides?.store_target;

    expect(savedOverride?.priceMode).toBe('independent');
    expect(savedOverride?.currentPrice).toBe(88);
    expect(savedOverride?.skuPriceOverrides).toEqual([
      {
        skuId: 'sku_1',
        currentPrice: 88,
      },
      {
        skuId: 'sku_2',
        currentPrice: 118,
      },
    ]);
  });

  it('rejects independent price save when neither legacy rules nor allowSelfPrice authorize it', async () => {
    const product = createShareProduct({
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 12:30:00',
          referencedAt: '2026-04-23 12:40:00',
          sellableSkuIds: ['sku_1', 'sku_2'],
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
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save: vi.fn(),
    };

    await expect(
      service.updateProductStoreOverride({
        productId: 'product_1',
        storeId: 'store_target',
        priceMode: 'independent',
        stockMode: 'follow',
        skuPriceOverrides: [
          {
            skuId: 'sku_1',
            currentPrice: 88,
          },
          {
            skuId: 'sku_2',
            currentPrice: 118,
          },
        ],
        skuStockOverrides: [],
        skuStatusOverrides: [],
        nameMode: 'follow',
        carouselMode: 'follow',
        overrideCarouselImages: [],
      })
    ).rejects.toThrowError('源商品未开放独立售价');
  });

  it('rejects local sku items for single spec products', async () => {
    const product = createShareProduct({
      specMode: 'single',
      skus: [
        {
          id: 'sku_1',
          specText: '',
          price: 100,
          stock: 10,
          status: 'on',
        },
      ],
    });
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save: vi.fn(),
    };

    await expect(
      service.updateProductStoreOverride({
        productId: 'product_1',
        storeId: 'store_target',
        priceMode: 'follow',
        stockMode: 'follow',
        localSkuItems: [
          {
            skuId: 'local_1',
            specText: '红色',
            price: 90,
            stock: 4,
            sellStatus: 'sellable',
            status: 'on',
          },
        ],
        nameMode: 'follow',
        carouselMode: 'follow',
        overrideCarouselImages: [],
      })
    ).rejects.toThrowError('单规格商品不支持新增 SKU');
  });

  it('updates self-built sku sell status and channel status together', async () => {
    const product = createShareProduct({
      sourceStoreId: 'store_target',
      storeConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
      ],
      shareTargets: [],
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductSkuStatuses({
      productId: 'product_1',
      storeId: 'store_target',
      skuIds: ['sku_1'],
      action: 'unsellable',
    });

    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    expect(savedProducts[0].skus[0].sellStatus).toBe('unsellable');
    expect(savedProducts[0].skus[0].status).toBe('off');
  });

  it('updates local sku status overrides together with shared sku changes', async () => {
    const product = createShareProduct({
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
          localSkuItems: [
            {
              skuId: 'local_1',
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
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductSkuStatuses({
      productId: 'product_1',
      storeId: 'store_target',
      skuIds: ['local_1'],
      action: 'unsellable',
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    expect(savedProducts[0].storeOverrides?.store_target?.localSkuItems).toEqual([
      {
        skuId: 'local_1',
        specText: '红色',
        price: 90,
        stock: 4,
        sellStatus: 'unsellable',
        status: 'off',
        image: {
          id: 'image_1',
          name: '红色图',
          url: 'https://example.com/red.png',
        },
        isDefaultSelected: true,
      },
    ]);
  });

  it('sets shared unsellable sku to sellable without writing a separate status override', async () => {
    const product = createShareProduct({
      shareTargets: [
        {
          storeId: 'store_target',
          status: 'referenced',
          sharedAt: '2026-04-23 12:30:00',
          referencedAt: '2026-04-23 12:40:00',
          sellableSkuIds: ['sku_1'],
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
          channelStatus: 'on',
        },
      ],
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductSkuStatuses({
      productId: 'product_1',
      storeId: 'store_target',
      skuIds: ['sku_2'],
      action: 'sellable',
    });

    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    expect(savedProducts[0].storeOverrides?.store_target?.skuSellStatusOverrides).toEqual([
      {
        skuId: 'sku_2',
        currentSellStatus: 'sellable',
      },
    ]);
    expect(savedProducts[0].storeOverrides?.store_target?.skuStatusOverrides || []).toHaveLength(0);
  });

  it('clears targeted shared sku status overrides because store-specific up/down is no longer managed', async () => {
    const product = createShareProduct({
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
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'follow',
          stockMode: 'follow',
          currentPrice: undefined,
          skuPriceOverrides: [],
          skuStockOverrides: [],
          skuStatusOverrides: [{ skuId: 'sku_1', currentStatus: 'off' }],
          nameMode: 'follow',
          carouselMode: 'follow',
          overrideCarouselImages: [],
        },
      },
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductSkuStatuses({
      productId: 'product_1',
      storeId: 'store_target',
      skuIds: ['sku_1', 'sku_2'],
      action: 'on',
    });

    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    expect(savedProducts[0].storeOverrides?.store_target?.skuStatusOverrides || []).toHaveLength(0);
    expect(savedProducts[0].storeOverrides?.store_target?.skuSellStatusOverrides || []).toHaveLength(0);
  });
});

describe('ProductService store configs', () => {
  it('allows saving standard products with appended skus while keeping existing skus intact', async () => {
    const product = createShareProduct();
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.saveProduct({
      ...product,
      skus: [
        ...product.skus,
        {
          id: 'sku_3',
          specText: '规格3',
          price: 140,
          stock: 6,
          status: 'on',
        },
      ],
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    expect(savedProducts[0].skus.map((item) => item.id)).toEqual([
      'sku_1',
      'sku_2',
      'sku_3',
    ]);
  });

  it('rejects deleting existing skus when saving standard products', async () => {
    const product = createShareProduct();
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save: vi.fn(),
    };

    await expect(
      service.saveProduct({
        ...product,
        skus: [product.skus[0]],
      })
    ).rejects.toThrowError('普通商品编辑时不允许新增或删除销售规格');
  });

  it('rejects changing existing sku spec text when saving standard products', async () => {
    const product = createShareProduct();
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save: vi.fn(),
    };

    await expect(
      service.saveProduct({
        ...product,
        skus: product.skus.map((item) =>
          item.id === 'sku_1'
            ? {
                ...item,
                specText: '改后的规格1',
              }
            : item
        ),
      })
    ).rejects.toThrowError('普通商品编辑时不允许修改已有销售规格');
  });

  it('rejects changing immutable standard product fields on save', async () => {
    const product = createShareProduct();
    const service = new ProductService() as any;

    service.repository = {
      list: vi.fn().mockResolvedValue([product]),
      save: vi.fn(),
    };

    await expect(
      service.saveProduct({
        ...product,
        inventoryUnit: '件',
      })
    ).rejects.toThrowError('普通商品编辑时不允许修改库存单位');
  });

  it('updates product store configs and turns unsellable stores to off', async () => {
    const product = createShareProduct({
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
    });
    const otherProduct = createShareProduct({
      id: 'product_2',
      name: '其他商品',
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product, otherProduct]),
      save,
    };

    await service.updateProductStoreConfigs({
      productId: 'product_1',
      storeConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'unsellable',
          channelStatus: 'on',
        },
        {
          storeId: 'store_new',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedProduct = savedProducts.find((item) => item.id === 'product_1');
    const untouchedProduct = savedProducts.find((item) => item.id === 'product_2');

    expect(savedProduct?.storeConfigs).toEqual([
      {
        storeId: 'store_source',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_target',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
      {
        storeId: 'store_new',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ]);
    expect(savedProduct?.status).toBe('on');
    expect(untouchedProduct).toBe(otherProduct);
  });
});

describe('ProductService store channel config', () => {
  it('updates self-built sales stores to match the product-pool management modal', async () => {
    const product = createShareProduct({
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
          sharedAt: '2026-04-23 12:30:00',
          referencedAt: '2026-04-23 12:35:00',
          sellableSkuIds: ['sku_1', 'sku_2'],
          allowSelfPrice: true,
        },
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'independent',
          stockMode: 'follow',
          currentPrice: 109,
          skuPriceOverrides: [
            {
              skuId: 'sku_1',
              currentPrice: 109,
            },
          ],
          skuStockOverrides: [],
          skuSellStatusOverrides: [],
          skuStatusOverrides: [],
          localSkuItems: [],
          nameMode: 'follow',
          overrideName: undefined,
          carouselMode: 'follow',
          overrideCarouselImages: [],
          updatedAt: '2026-04-23 12:40:00',
        },
      },
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save,
    };

    await service.updateProductStoreChannelConfig({
      productId: 'product_1',
      productPoolStoreConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuIds: ['sku_1'],
        },
        {
          storeId: 'store_other',
          sellStatus: 'unsellable',
          channelStatus: 'on',
          sellableSkuIds: ['sku_2'],
          allowSelfPrice: true,
        },
      ],
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedProducts = save.mock.calls[0][0] as ProductItem[];
    const savedProduct = savedProducts[0];

    expect(savedProduct.storeChannelConfig).toEqual({
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
        {
          storeId: 'store_other',
          sellStatus: 'unsellable',
          channelStatus: 'off',
        },
      ],
    });
    expect(savedProduct.shareTargets).toEqual([
      {
        storeId: 'store_target',
        status: 'referenced',
        sharedAt: '2026-04-23 12:30:00',
        referencedAt: '2026-04-23 12:35:00',
        sellableSkuIds: ['sku_1'],
      },
    ]);
    expect(savedProduct.storeConfigs).toEqual([
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
      {
        storeId: 'store_other',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ]);
    expect(savedProduct.storeOverrides?.store_target).toMatchObject({
      storeId: 'store_target',
      priceMode: 'independent',
      currentPrice: 109,
      skuPriceOverrides: [
        {
          skuId: 'sku_1',
          currentPrice: 109,
        },
      ],
      skuSellStatusOverrides: [
        {
          skuId: 'sku_2',
          currentSellStatus: 'unsellable',
        },
      ],
      skuStatusOverrides: [],
    });
  });

  it('rejects sales-store updates for non-self-built products', async () => {
    const product = createShareProduct({
      sourceType: 'headquarter',
      sourceStoreId: undefined,
    });
    const service = new ProductService() as any;

    service.repository = {
      getById: vi.fn().mockResolvedValue(product),
      list: vi.fn().mockResolvedValue([product]),
      save: vi.fn(),
    };

    await expect(
      service.updateProductStoreChannelConfig({
        productId: 'product_1',
        productPoolStoreConfigs: [
          {
            storeId: 'store_target',
            sellStatus: 'sellable',
            channelStatus: 'on',
            sellableSkuIds: ['sku_1'],
          },
        ],
      })
    ).rejects.toThrow('仅支持本店自建商品管理销售店铺');
  });
});

describe('ProductService query list filters', () => {
  it('filters by current store sell status', () => {
    const sellableProduct = createShareProduct({
      id: 'product_sellable',
      sourceStoreId: 'store_target',
      shareTargets: [],
      storeConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
    });
    const unsellableProduct = createShareProduct({
      id: 'product_unsellable',
      sourceStoreId: 'store_target',
      shareTargets: [],
      storeConfigs: [
        {
          storeId: 'store_target',
          sellStatus: 'unsellable',
          channelStatus: 'off',
        },
      ],
    });
    const service = new ProductService() as any;

    service.repository = {
      readSnapshot: vi.fn().mockReturnValue([sellableProduct, unsellableProduct]),
    };

    const sellableResult = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: createListFilters({
        sellStatus: 'sellable',
      }),
      organizationScope: 'store',
      visibleStoreIds: ['store_target'],
      page: 1,
      pageSize: 20,
    });
    const unsellableResult = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: createListFilters({
        sellStatus: 'unsellable',
      }),
      organizationScope: 'store',
      visibleStoreIds: ['store_target'],
      page: 1,
      pageSize: 20,
    });

    expect(sellableResult.items).toHaveLength(1);
    expect(sellableResult.items[0].id).toBe('product_sellable');
    expect(unsellableResult.items).toHaveLength(1);
    expect(unsellableResult.items[0].id).toBe('product_unsellable');
  });

  it('supports online mall self-built standard products for bundle selector options', () => {
    const onlineSelfBuiltProduct = createShareProduct({
      id: 'product_online_self_built',
      name: '线上商城自建商品',
      sourceStoreId: 'mall_online',
      shareTargets: [],
      storeConfigs: [
        {
          storeId: 'mall_online',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
      ],
    });
    const sharedProduct = createShareProduct({
      id: 'product_shared_from_store',
      name: '来自线下店的共享商品',
      sourceStoreId: 'store_source',
      shareTargets: [],
      storeConfigs: [
        {
          storeId: 'store_source',
          sellStatus: 'sellable',
          channelStatus: 'on',
        },
        {
          storeId: 'mall_online',
          sellStatus: 'sellable',
          channelStatus: 'off',
        },
      ],
    });
    const service = new ProductService() as any;

    service.repository = {
      readSnapshot: vi
        .fn()
        .mockReturnValue([onlineSelfBuiltProduct, sharedProduct]),
    };

    const result = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: createListFilters(),
      organizationScope: 'store',
      visibleStoreIds: ['mall_online'],
      page: 1,
      pageSize: 20,
    });

    const selectorOptions = result.items.filter(
      (item) =>
        item.productKind === 'standard' &&
        item.storeView.isSelfBuilt &&
        item.sourceStoreId === 'mall_online'
    );

    expect(selectorOptions).toHaveLength(1);
    expect(selectorOptions[0].id).toBe('product_online_self_built');
    expect(selectorOptions[0].storeView.isSelfBuilt).toBe(true);
  });
});

describe('ProductService share pool filters', () => {
  it('supports product kind filter for all, standard, and combo; excludes bundle', () => {
    const service = new ProductService() as any;
    service.repository = {
      readSnapshot: vi.fn(() => createSharePoolFilterProducts()),
    };

    const allResult = service.querySharePool({
      storeId: 'store_guangzhou',
      page: 1,
      pageSize: 50,
    });
    const standardResult = service.querySharePool({
      storeId: 'store_guangzhou',
      productKind: 'standard',
      page: 1,
      pageSize: 50,
    });
    const comboResult = service.querySharePool({
      storeId: 'store_guangzhou',
      productKind: 'combo',
      page: 1,
      pageSize: 50,
    });

    expect(allResult.total).toBe(2);
    expect(standardResult.total).toBe(2);
    expect(comboResult.total).toBe(0);
  });

  it('supports share pool filters for catalog, ownership, source, price, and created date', () => {
    const service = new ProductService() as any;
    service.repository = {
      readSnapshot: vi.fn(() => createSharePoolFilterProducts()),
    };

    const result = service.querySharePool({
      storeId: 'store_guangzhou',
      page: 1,
      pageSize: 50,
      filters: {
        searchType: 'productName',
        keyword: '苹果',
        productCatalogId: 'international',
        productOwnershipId: 'item_06_02_01',
        productSourceType: 'store',
        sourceStoreIds: ['store_suzhou'],
        minPrice: 90,
        maxPrice: 110,
        createdAtRange: ['2026-04-01', '2026-04-30'],
      },
    });

    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('pool_standard_1');
  });

  it('keeps backward compatible keyword filtering when filters are not provided', () => {
    const service = new ProductService() as any;
    service.repository = {
      readSnapshot: vi.fn(() => createSharePoolFilterProducts()),
    };

    const result = service.querySharePool({
      storeId: 'store_guangzhou',
      page: 1,
      pageSize: 50,
      keyword: '苹果单品',
    });

    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('pool_standard_1');
  });

  it('supports combining share status filter and product kind filter', () => {
    const service = new ProductService() as any;
    service.repository = {
      readSnapshot: vi.fn(() => createSharePoolFilterProducts()),
    };

    const result = service.querySharePool({
      storeId: 'store_guangzhou',
      status: 'referenced',
      productKind: 'standard',
      page: 1,
      pageSize: 50,
      filters: {
        searchType: 'productName',
        keyword: '',
        sourceStoreIds: [],
        createdAtRange: [],
      },
    });

    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('pool_standard_2');
  });
});
