import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductService } from '@/services/ProductService';
import { DEFAULT_PRODUCTS } from '@/repositories/product/defaultProducts';
import { ProductRepository } from './ProductRepository';

const persistentStateMocks = vi.hoisted(() => ({
  readPersistentValue: vi.fn(),
  writePersistentValue: vi.fn(),
}));

vi.mock('@/utils/usePersistentState', () => ({
  readPersistentValue: persistentStateMocks.readPersistentValue,
  writePersistentValue: persistentStateMocks.writePersistentValue,
}));

describe('ProductRepository seeded mock recovery', () => {
  beforeEach(() => {
    persistentStateMocks.readPersistentValue.mockReset();
    persistentStateMocks.writePersistentValue.mockReset();
  });

  it('keeps seeded chengdu store products visible when persisted seed snapshot is stale', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue(
      DEFAULT_PRODUCTS.map((item) => ({
        ...item,
        storeConfigs: [],
        skus: [],
        sourceStoreId: item.sourceType === 'store' ? '' : item.sourceStoreId,
      }))
    );

    const service = new ProductService();
    const result = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: {
        searchType: 'productName',
        keyword: '',
        sourceStoreIds: [],
        createdAtRange: [],
      },
      organizationScope: 'store',
      visibleStoreIds: ['store_chengdu'],
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'G_1215778084171681792',
        'G_1210998727024709632',
      ])
    );
  });

  it('removes retired seeded mock products from persisted snapshots while preserving custom items', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'G_1260413000000000001',
        name: '已退役共享商品',
      },
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_1',
        name: '自定义商品',
        createdAt: '2026-04-30 10:00:00',
      },
    ]);

    const service = new ProductService();
    const result = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: {
        searchType: 'productName',
        keyword: '',
        sourceStoreIds: [],
        createdAtRange: [],
      },
      organizationScope: 'headquarter',
      visibleStoreIds: [],
      page: 1,
      pageSize: 20,
    });

    expect(result.items.map((item) => item.id)).not.toContain('G_1260413000000000001');
    expect(result.items.map((item) => item.id)).toContain('custom_product_1');
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
    expect(
      persistentStateMocks.writePersistentValue.mock.calls[
        persistentStateMocks.writePersistentValue.mock.calls.length - 1
      ][1]
    ).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: 'G_1260413000000000001',
        }),
      ])
    );
  });

  it('normalizes persisted sku image and keeps only one visible default-selected sku', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_2',
        name: '带规格图商品',
        skus: [
          {
            id: 'sku_1',
            specText: '年级：10年级 / 课程体系：IB',
            price: 199,
            stock: 10,
            status: 'on',
            image: {
              id: ' image_1 ',
              name: ' 主图 ',
              url: ' https://example.com/ib.png ',
            },
            isDefaultSelected: true,
          },
          {
            id: 'sku_2',
            specText: '年级：10年级 / 课程体系：IG',
            price: 299,
            stock: 8,
            status: 'off',
            isDefaultSelected: true,
          },
        ],
      },
    ]);

    const repository = new ProductRepository();
    const [product] = repository.readSnapshot().filter((item) => item.id === 'custom_product_2');

    expect(product.skus).toEqual([
      {
        id: 'sku_1',
        specText: '年级：10年级 / 课程体系：IB',
        price: 199,
        stock: 10,
        status: 'on',
        sellStatus: 'sellable',
        image: {
          id: 'image_1',
          name: '主图',
          url: 'https://example.com/ib.png',
        },
        isDefaultSelected: true,
      },
      {
        id: 'sku_2',
        specText: '年级：10年级 / 课程体系：IG',
        price: 299,
        stock: 8,
        status: 'off',
        sellStatus: 'sellable',
      },
    ]);
  });

  it('normalizes product detail fields for limit rule and rich content', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_3',
        name: '详情字段商品',
        isLimited: true,
        limitCount: 2.8,
        detailHtml: '<p>图文详情</p>',
      },
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_4',
        name: '不限购商品',
        isLimited: false,
        detailHtml: undefined,
      },
    ]);

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();
    const limitedProduct = snapshot.find((item) => item.id === 'custom_product_3');
    const unlimitedProduct = snapshot.find((item) => item.id === 'custom_product_4');

    expect(limitedProduct).toMatchObject({
      isLimited: true,
      limitCount: 2,
      detailHtml: '<p>图文详情</p>',
    });
    expect(unlimitedProduct).toMatchObject({
      isLimited: false,
      detailHtml: '',
    });
    expect(unlimitedProduct?.limitCount).toBeUndefined();
  });

  it('normalizes and preserves combo options for combo products', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS.find((item) => item.productKind === 'combo'),
        id: 'custom_combo_1',
        name: '组合配置商品',
        productKind: 'combo',
        comboOptions: [
          {
            id: ' option_a ',
            title: ' 主选项 ',
            required: true,
            selectionLimit: 3,
            items: [
              {
                productId: ' product_1 ',
                skuId: ' sku_1 ',
                comboPrice: 399,
                quantity: 2,
                required: true,
              },
              {
                productId: 'product_1',
                skuId: 'sku_1',
                comboPrice: 299,
                quantity: 1,
                required: false,
              },
            ],
          },
        ],
      },
    ]);

    const repository = new ProductRepository();
    const comboProduct = repository
      .readSnapshot()
      .find((item) => item.id === 'custom_combo_1');

    expect(comboProduct?.comboOptions).toEqual([
      {
        id: 'option_a',
        title: '主选项',
        optionType: 'must_buy',
        required: true,
        selectionLimit: 1,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            comboPrice: 399,
            quantity: 2,
            required: true,
            listed: true,
            defaultSelected: true,
          },
        ],
      },
    ]);
  });

  it('does not keep combo options on non-combo products', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_standard_with_combo',
        productKind: 'standard',
        comboOptions: [
          {
            id: 'option_1',
            title: '不应保留',
            required: true,
            selectionLimit: 1,
            items: [
              {
                productId: 'product_1',
                skuId: 'sku_1',
                comboPrice: 100,
                quantity: 1,
                required: true,
              },
            ],
          },
        ],
      },
    ]);

    const repository = new ProductRepository();
    const standardProduct = repository
      .readSnapshot()
      .find((item) => item.id === 'custom_standard_with_combo');

    expect(standardProduct?.comboOptions).toBeUndefined();
  });

  it('backfills newly seeded shared-pool products into stale persisted snapshots', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue(
      DEFAULT_PRODUCTS.filter(
        (item) =>
          ![
            'G_1260601000000000010',
            'C_1260601000000000010',
            'G_1260601000000000011',
            'C_1260601000000000011',
            'G_1260601000000000012',
            'G_1260601000000000013',
          ].includes(item.id)
      )
    );

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();

    expect(snapshot.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'G_1260601000000000010',
        'C_1260601000000000010',
        'G_1260601000000000011',
        'C_1260601000000000011',
        'G_1260601000000000012',
        'G_1260601000000000013',
      ])
    );
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000010')?.storeChannelConfig
    ).toMatchObject({
      shareMode: 'shared_pool',
      storeIds: ['mall_online', 'mall_mini_program'],
    });
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000012')?.storeChannelConfig
    ).toMatchObject({
      shareMode: 'product_pool',
      storeIds: ['store_beijing'],
    });
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000011')?.storeChannelConfig
    ).toMatchObject({
      shareMode: 'shared_pool',
      storeIds: ['store_beijing'],
    });
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000013')?.independentPriceRule
    ).toMatchObject({
      enabled: false,
    });
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
  });

  it('backfills newly seeded combo mock products for self-built and referenced scenarios', () => {
    const seededComboMockIds = [
      'C_1260601000000000031',
      'C_1260601000000000032',
      'C_1260601000000000033',
      'C_1260601000000000034',
      'C_1260601000000000035',
      'C_1260601000000000036',
    ];
    const selfBuiltComboIds = seededComboMockIds.slice(0, 3);
    const referencedComboIds = seededComboMockIds.slice(3);

    persistentStateMocks.readPersistentValue.mockReturnValue(
      DEFAULT_PRODUCTS.filter((item) => !seededComboMockIds.includes(item.id))
    );

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();

    expect(snapshot.map((item) => item.id)).toEqual(
      expect.arrayContaining(seededComboMockIds)
    );
    expect(
      seededComboMockIds.every((id) => {
        const product = snapshot.find((item) => item.id === id);
        return product?.productKind === 'combo' && Boolean(product.comboOptions?.length);
      })
    ).toBe(true);
    expect(
      selfBuiltComboIds.every(
        (id) => snapshot.find((item) => item.id === id)?.sourceStoreId === 'store_shenzhen'
      )
    ).toBe(true);
    expect(
      referencedComboIds.every((id) =>
        snapshot
          .find((item) => item.id === id)
          ?.shareTargets?.some(
            (target) =>
              target.storeId === 'store_shenzhen' && target.status === 'referenced'
          )
      )
    ).toBe(true);
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
  });

  it('refreshes seeded combo mock products from stale persisted local snapshots', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS.find((item) => item.id === 'C_1260601000000000031'),
        sourceStoreId: 'store_guangzhou',
        storeConfigs: [
          {
            storeId: 'store_guangzhou',
            sellStatus: 'sellable',
            channelStatus: 'on',
          },
        ],
      },
      {
        ...DEFAULT_PRODUCTS.find((item) => item.id === 'C_1260601000000000034'),
        shareTargets: [
          {
            storeId: 'store_guangzhou',
            status: 'referenced',
            sharedAt: '2026-05-11 10:50:00',
            referencedAt: '2026-05-11 11:00:00',
          },
        ],
      },
      {
        ...DEFAULT_PRODUCTS.find((item) => item.id === 'C_1260601000000000036'),
        sourceStoreId: 'store_shenzhen',
        storeConfigs: [
          {
            storeId: 'store_shenzhen',
            sellStatus: 'sellable',
            channelStatus: 'on',
          },
        ],
      },
    ]);

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();

    expect(
      snapshot.find((item) => item.id === 'C_1260601000000000031')
    ).toMatchObject({
      sourceStoreId: 'store_shenzhen',
    });
    expect(
      snapshot.find((item) => item.id === 'C_1260601000000000034')?.shareTargets
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storeId: 'store_shenzhen',
          status: 'referenced',
        }),
      ])
    );
    expect(
      snapshot.find((item) => item.id === 'C_1260601000000000036')
    ).toMatchObject({
      sourceStoreId: 'store_suzhou',
    });
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
  });

  it('backfills guangzhou seeded combo sub-products from stale persisted snapshots', () => {
    const guangzhouComboIds = [
      'C_1260601000000000001',
      'C_1260601000000000002',
      'C_1260601000000000003',
      'C_1260601000000000004',
      'C_1260601000000000010',
    ];

    persistentStateMocks.readPersistentValue.mockReturnValue(
      DEFAULT_PRODUCTS.map((item) => {
        if (!guangzhouComboIds.includes(item.id)) {
          return item;
        }

        const { comboOptions: _comboOptions, ...legacyComboProduct } = item;
        return {
          ...legacyComboProduct,
          bundleComponents: [],
        };
      })
    );

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();

    expect(
      guangzhouComboIds.every((id) => {
        const product = snapshot.find((item) => item.id === id);
        return product?.productKind === 'combo' && Boolean(product.comboOptions?.length);
      })
    ).toBe(true);
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
  });

  it('ships enabled store-channel mock data for both product-pool and shared-pool modes', () => {
    const standardModes = DEFAULT_PRODUCTS.filter(
      (item) => item.productKind === 'standard' && item.storeChannelConfig
    ).map((item) => item.storeChannelConfig?.shareMode);
    const comboModes = DEFAULT_PRODUCTS.filter(
      (item) => item.productKind === 'combo' && item.storeChannelConfig
    ).map((item) => item.storeChannelConfig?.shareMode);

    expect(standardModes).toEqual(
      expect.arrayContaining(['product_pool', 'shared_pool'])
    );
    expect(comboModes).toEqual(
      expect.arrayContaining(['product_pool', 'shared_pool'])
    );
  });
});
