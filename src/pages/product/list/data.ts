import { Dispatch, SetStateAction, useMemo } from 'react';
import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';
import {
  normalizeProductCarouselImages,
  normalizeProductIndependentPriceRule,
  normalizeProductStoreOverride,
} from '@/lib/product';
import type {
  ProductCarouselImage,
  ProductIndependentPriceRule,
  ProductStoreOverrideMap,
} from '@/types/product';
import { ProductStoreConfigItem } from '../store-config/data';

/**
 * @deprecated 过渡兼容层。
 * 新增或改造的商品列表链路请优先使用：
 * - src/types/product.ts
 * - src/repositories/ProductRepository.ts
 * - src/services/ProductService.ts
 */

export type ProductSearchType = 'productName' | 'productId';
export type ProductStatus = 'on' | 'off';
export type ProductType = 'virtual' | 'course' | 'service';
export type ProductSpecMode = 'single' | 'multi';
export type ProductSourceType = 'headquarter' | 'store';

const PRODUCT_STORAGE_KEY = 'product-items-v2';

export type ProductSkuItem = {
  id: string;
  specText: string;
  price: number;
  stock: number;
  status: ProductStatus;
};

export type ProductItem = {
  id: string;
  name: string;
  productCatalogId: string;
  productOwnershipId: string;
  productType: ProductType;
  inventoryUnit: string;
  specMode: ProductSpecMode;
  skus: ProductSkuItem[];
  status: ProductStatus;
  price: number;
  stock: number;
  createdAt: string;
  sourceType: ProductSourceType;
  sourceStoreId?: string;
  storeConfigs: ProductStoreConfigItem[];
  carouselImages?: ProductCarouselImage[];
  storeOverrides?: ProductStoreOverrideMap;
  independentPriceRule?: ProductIndependentPriceRule;
};

export type ProductFilterValues = {
  searchType: ProductSearchType;
  keyword: string;
  productCatalogId?: string;
  productOwnershipId?: string;
  productSourceType?: ProductSourceType;
  minPrice?: number;
  maxPrice?: number;
  createdAtRange: string[];
};

export const PRODUCT_TYPE_LABEL_MAP: Record<ProductType, string> = {
  virtual: '虚拟商品',
  course: '课程商品',
  service: '服务商品',
};

export const DEFAULT_FILTER_VALUES: ProductFilterValues = {
  searchType: 'productName',
  keyword: '',
  productCatalogId: undefined,
  productOwnershipId: undefined,
  productSourceType: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  createdAtRange: [],
};

export const PRODUCT_SOURCE_LABEL_MAP: Record<ProductSourceType, string> = {
  headquarter: '总部创建',
  store: '门店创建',
};

export const PRODUCT_SOURCE_OPTIONS = [
  {
    label: PRODUCT_SOURCE_LABEL_MAP.headquarter,
    value: 'headquarter' as ProductSourceType,
  },
  {
    label: PRODUCT_SOURCE_LABEL_MAP.store,
    value: 'store' as ProductSourceType,
  },
];

export const DEFAULT_INVENTORY_UNIT = '份';

export const INVENTORY_UNIT_OPTIONS = [
  DEFAULT_INVENTORY_UNIT,
  '课时',
  '课次',
  '期',
  '名额',
  '人次',
  '席位',
  '套',
];

export const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: 'G_1237036327413878784',
    name: '唯寻2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'virtual',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1237036327413878784-1',
        specText: '标准版',
        price: 199,
        stock: 1800,
        status: 'on',
      },
      {
        id: 'sku-G_1237036327413878784-2',
        specText: 'VIP版',
        price: 239,
        stock: 1198,
        status: 'on',
      },
    ],
    status: 'off',
    price: 199,
    stock: 2998,
    createdAt: '2026-04-02 11:01:49',
    sourceType: 'headquarter',
    storeConfigs: [
      {
        storeId: 'store_shanghai',
        sellStatus: 'sellable',
        channelStatus: 'off',
      },
      {
        storeId: 'mall_online',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_jiangsu',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
  },
  {
    id: 'G_1231319097741021184',
    name: '[唯寻] 2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1231319097741021184-1',
        specText: '',
        price: 199,
        stock: 29992,
        status: 'on',
      },
    ],
    status: 'off',
    price: 199,
    stock: 29992,
    createdAt: '2026-03-17 16:23:35',
    sourceType: 'store',
    sourceStoreId: 'store_beijing',
    storeConfigs: [
      {
        storeId: 'store_beijing',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_online',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1231318174553739264',
    name: '[唯寻] 2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1231318174553739264-1',
        specText: '',
        price: 199,
        stock: 29980,
        status: 'on',
      },
    ],
    status: 'on',
    price: 199,
    stock: 29980,
    createdAt: '2026-03-17 16:19:55',
    sourceType: 'store',
    sourceStoreId: 'store_shanghai',
    storeConfigs: [
      {
        storeId: 'store_shanghai',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1215778084171681792',
    name: 'ALEVEL定制学习服务',
    productCatalogId: 'service',
    productOwnershipId: 'item_06_01_01',
    productType: 'service',
    inventoryUnit: '课时',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1215778084171681792-1',
        specText: '',
        price: 1,
        stock: 444,
        status: 'off',
      },
    ],
    status: 'on',
    price: 1,
    stock: 444,
    createdAt: '2026-02-02 19:09:09',
    sourceType: 'headquarter',
    storeConfigs: [
      {
        storeId: 'store_hangzhou',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
      {
        storeId: 'mall_mini_program',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1211793802365374464',
    name: '[唯寻橡沐] AP预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_07',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1211793802365374464-1',
        specText: '录播班',
        price: 49,
        stock: 600,
        status: 'on',
      },
      {
        id: 'sku-G_1211793802365374464-2',
        specText: '直播班',
        price: 69,
        stock: 400,
        status: 'on',
      },
    ],
    status: 'on',
    price: 49,
    stock: 1000,
    createdAt: '2026-01-22 19:17:02',
    sourceType: 'store',
    sourceStoreId: 'store_shanghai',
    storeConfigs: [
      {
        storeId: 'store_shanghai',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_online',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_mini_program',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
  },
  {
    id: 'G_1211793279398580224',
    name: '[唯寻橡沐] IB预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_07',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1211793279398580224-1',
        specText: '录播班',
        price: 49,
        stock: 380,
        status: 'on',
      },
      {
        id: 'sku-G_1211793279398580224-2',
        specText: '直播班',
        price: 69,
        stock: 219,
        status: 'off',
      },
    ],
    status: 'on',
    price: 49,
    stock: 599,
    createdAt: '2026-01-22 19:14:57',
    sourceType: 'store',
    sourceStoreId: 'store_beijing',
    storeConfigs: [
      {
        storeId: 'store_beijing',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_jiangsu',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
  },
  {
    id: 'G_1210999402622266432',
    name: '[唯寻橡沐] AP冲刺班',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_08',
    productType: 'service',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210999402622266432-1',
        specText: '',
        price: 129,
        stock: 998,
        status: 'on',
      },
    ],
    status: 'on',
    price: 129,
    stock: 998,
    createdAt: '2026-01-20 14:40:22',
    sourceType: 'headquarter',
    storeConfigs: [],
  },
  {
    id: 'G_1210998727024709632',
    name: '[唯寻橡沐] IB冲刺班',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_08',
    productType: 'service',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210998727024709632-1',
        specText: '',
        price: 129,
        stock: 0,
        status: 'on',
      },
    ],
    status: 'on',
    price: 129,
    stock: 0,
    createdAt: '2026-01-20 14:37:41',
    sourceType: 'store',
    sourceStoreId: 'store_hangzhou',
    storeConfigs: [
      {
        storeId: 'store_hangzhou',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
  },
  {
    id: 'G_1210997383807242240',
    name: '[唯寻橡沐] AP预习课',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_07',
    productType: 'virtual',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210997383807242240-1',
        specText: '',
        price: 49,
        stock: 1000,
        status: 'off',
      },
    ],
    status: 'on',
    price: 49,
    stock: 1000,
    createdAt: '2026-01-20 14:32:21',
    sourceType: 'headquarter',
    storeConfigs: [
      {
        storeId: 'mall_online',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_mini_program',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1210876543210987654',
    name: '2026年STEP数学冲刺营',
    productCatalogId: 'international',
    productOwnershipId: 'item_05_02_05',
    productType: 'course',
    inventoryUnit: '席位',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1210876543210987654-1',
        specText: '录播班',
        price: 299,
        stock: 52,
        status: 'off',
      },
      {
        id: 'sku-G_1210876543210987654-2',
        specText: '直播班',
        price: 359,
        stock: 36,
        status: 'on',
      },
    ],
    status: 'off',
    price: 299,
    stock: 88,
    createdAt: '2026-01-05 09:30:00',
    sourceType: 'store',
    sourceStoreId: 'store_beijing',
    storeConfigs: [
      {
        storeId: 'store_beijing',
        sellStatus: 'sellable',
        channelStatus: 'off',
      },
      {
        storeId: 'store_hangzhou',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
  },
  {
    id: 'G_1210123456789012345',
    name: '雅思一对一提升服务',
    productCatalogId: 'planning',
    productOwnershipId: 'item_06_03_01',
    productType: 'service',
    inventoryUnit: '课时',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210123456789012345-1',
        specText: '',
        price: 899,
        stock: 32,
        status: 'on',
      },
    ],
    status: 'on',
    price: 899,
    stock: 32,
    createdAt: '2025-12-28 20:15:18',
    sourceType: 'headquarter',
    storeConfigs: [
      {
        storeId: 'store_shanghai',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_beijing',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_online',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1209988776655443322',
    name: '牛津面试模考包',
    productCatalogId: 'thesis',
    productOwnershipId: 'item_05_03_04',
    productType: 'virtual',
    inventoryUnit: '套',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1209988776655443322-1',
        specText: '标准版',
        price: 159,
        stock: 120,
        status: 'on',
      },
      {
        id: 'sku-G_1209988776655443322-2',
        specText: 'VIP版',
        price: 199,
        stock: 80,
        status: 'on',
      },
    ],
    status: 'off',
    price: 159,
    stock: 200,
    createdAt: '2025-12-18 18:08:42',
    sourceType: 'headquarter',
    storeConfigs: [
      {
        storeId: 'mall_online',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_jiangsu',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'mall_mini_program',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
  },
  {
    id: 'G_1260408000000000001',
    name: '总部下发·春季留学规划诊断包',
    productCatalogId: 'planning',
    productOwnershipId: 'item_06_03_01',
    productType: 'service',
    inventoryUnit: '课时',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1260408000000000001-1',
        specText: '',
        price: 299,
        stock: 240,
        status: 'on',
      },
    ],
    status: 'on',
    price: 299,
    stock: 240,
    createdAt: '2026-04-08 09:15:00',
    sourceType: 'headquarter',
    storeConfigs: [
      {
        storeId: 'store_suzhou',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_guangzhou',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_shenzhen',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1260408000000000002',
    name: '苏州门店自建·周末到店体验课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1260408000000000002-1',
        specText: '基础班',
        price: 129,
        stock: 96,
        status: 'on',
      },
      {
        id: 'sku-G_1260408000000000002-2',
        specText: '拔高班',
        price: 169,
        stock: 68,
        status: 'on',
      },
    ],
    status: 'on',
    price: 129,
    stock: 164,
    createdAt: '2026-04-08 13:20:00',
    sourceType: 'store',
    sourceStoreId: 'store_suzhou',
    storeConfigs: [
      {
        storeId: 'store_suzhou',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1260408000000000003',
    name: '广州门店自建·科研规划答疑营',
    productCatalogId: 'international',
    productOwnershipId: 'item_05_02_05',
    productType: 'course',
    inventoryUnit: '席位',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1260408000000000003-1',
        specText: '',
        price: 219,
        stock: 88,
        status: 'on',
      },
    ],
    status: 'on',
    price: 219,
    stock: 88,
    createdAt: '2026-04-08 14:10:00',
    sourceType: 'store',
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
    id: 'G_1260408000000000004',
    name: '深圳门店自建·语言能力提升营',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_08',
    productType: 'service',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1260408000000000004-1',
        specText: '',
        price: 159,
        stock: 76,
        status: 'on',
      },
    ],
    status: 'on',
    price: 159,
    stock: 76,
    createdAt: '2026-04-08 15:05:00',
    sourceType: 'store',
    sourceStoreId: 'store_shenzhen',
    storeConfigs: [
      {
        storeId: 'store_shenzhen',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
  {
    id: 'G_1260408000000000005',
    name: '苏州门店自建·升学规划体验营',
    productCatalogId: 'planning',
    productOwnershipId: 'item_06_03_01',
    productType: 'service',
    inventoryUnit: '课时',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1260408000000000005-1',
        specText: '',
        price: 199,
        stock: 58,
        status: 'on',
      },
    ],
    status: 'on',
    price: 199,
    stock: 58,
    createdAt: '2026-04-08 15:36:00',
    sourceType: 'store',
    sourceStoreId: 'store_suzhou',
    storeConfigs: [
      {
        storeId: 'store_suzhou',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
    ],
  },
];

export const MOCK_PRODUCTS = DEFAULT_PRODUCTS;

const PRODUCT_STORE_ID_MIGRATION_MAP: Record<string, string> = {
  store_shanghai: 'store_suzhou',
  store_beijing: 'store_guangzhou',
  store_hangzhou: 'store_shenzhen',
};

function migrateProductStoreId(storeId?: string) {
  if (!storeId) {
    return undefined;
  }

  return PRODUCT_STORE_ID_MIGRATION_MAP[storeId] || storeId;
}

function isProductSourceType(value: unknown): value is ProductSourceType {
  return value === 'headquarter' || value === 'store';
}

export function normalizeProductItem(product: ProductItem): ProductItem {
  const sourceType = isProductSourceType(product.sourceType)
    ? product.sourceType
    : 'headquarter';
  const sourceStoreId =
    sourceType === 'store' ? migrateProductStoreId(product.sourceStoreId) : undefined;
  const storeConfigMap = new Map<string, ProductStoreConfigItem>();
  const storeOverrides = Object.entries(
    product.storeOverrides && typeof product.storeOverrides === 'object'
      ? product.storeOverrides
      : {}
  ).reduce<NonNullable<ProductItem['storeOverrides']>>((result, [storeId, override]) => {
    const nextStoreId = migrateProductStoreId(storeId);

    if (!nextStoreId) {
      return result;
    }

    result[nextStoreId] = normalizeProductStoreOverride(nextStoreId, override);
    return result;
  }, {});

  (Array.isArray(product.storeConfigs) ? product.storeConfigs : []).forEach((item) => {
    const nextStoreId = migrateProductStoreId(item.storeId);

    if (!nextStoreId) {
      return;
    }

    storeConfigMap.set(nextStoreId, {
      ...item,
      storeId: nextStoreId,
    });
  });

  return {
    ...product,
    sourceType,
    sourceStoreId,
    independentPriceRule: normalizeProductIndependentPriceRule(
      product.independentPriceRule,
      product.skus || []
    ),
    carouselImages: normalizeProductCarouselImages(product.carouselImages || []),
    storeConfigs: Array.from(storeConfigMap.values()),
    storeOverrides,
  };
}

export function normalizeProductItems(
  products: ProductItem[] = DEFAULT_PRODUCTS
) {
  return products.map((item) => normalizeProductItem(item));
}

function mergeProductSeedItems(products: ProductItem[] = []) {
  const normalizedRawItems = products.filter(
    (item): item is ProductItem => Boolean(item) && typeof item === 'object'
  );
  const existingIdSet = new Set(
    normalizedRawItems
      .map((item) => item.id)
      .filter((item): item is string => typeof item === 'string' && Boolean(item))
  );

  return [
    ...normalizedRawItems,
    ...DEFAULT_PRODUCTS.filter((item) => !existingIdSet.has(item.id)),
  ];
}

export function readProductItems() {
  const stored = readPersistentValue(PRODUCT_STORAGE_KEY, DEFAULT_PRODUCTS);
  const rawItems = Array.isArray(stored) ? stored : DEFAULT_PRODUCTS;
  const mergedItems = mergeProductSeedItems(rawItems);
  const normalizedItems = normalizeProductItems(mergedItems);

  if (JSON.stringify(rawItems) !== JSON.stringify(normalizedItems)) {
    writePersistentValue(PRODUCT_STORAGE_KEY, normalizedItems);
  }

  return normalizedItems;
}

export function filterProductStoreConfigsByStoreIds(
  storeConfigs: ProductStoreConfigItem[] = [],
  storeIds: string[] = []
) {
  if (!storeIds.length) {
    return [];
  }

  const visibleStoreIdSet = new Set(storeIds);
  return storeConfigs.filter((item) => visibleStoreIdSet.has(item.storeId));
}

export function hasProductStoreIntersection(
  product: ProductItem,
  storeIds: string[] = []
) {
  return filterProductStoreConfigsByStoreIds(product.storeConfigs, storeIds).length > 0;
}

export function filterProductsByStoreIds(
  products: ProductItem[],
  storeIds: string[] = []
) {
  if (!storeIds.length) {
    return [];
  }

  return products.filter((item) => hasProductStoreIntersection(item, storeIds));
}

export function useProductItems() {
  const [value, setValue] = usePersistentState<ProductItem[]>(
    PRODUCT_STORAGE_KEY,
    readProductItems()
  );
  const normalizedValue = useMemo(() => normalizeProductItems(value), [value]);

  const setNormalizedValue: Dispatch<SetStateAction<ProductItem[]>> = (
    nextValue
  ) => {
    setValue((previous) => {
      const normalizedPrevious = normalizeProductItems(previous);
      const resolvedValue =
        typeof nextValue === 'function'
          ? (
              nextValue as (previousState: ProductItem[]) => ProductItem[]
            )(normalizedPrevious)
          : nextValue;

      return normalizeProductItems(resolvedValue);
    });
  };

  return [normalizedValue, setNormalizedValue] as const;
}

export function createProductId() {
  return `G_${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;
}

export function createProductSkuId(productId: string, index: number) {
  return `sku-${productId}-${index + 1}`;
}

export function formatProductCreatedAt(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getMockProductById(id?: string) {
  if (!id) {
    return undefined;
  }

  return readProductItems().find((item) => item.id === id);
}

export function getProductSourceLabel(
  sourceType: ProductSourceType,
  storeName?: string
) {
  if (sourceType === 'store' && storeName) {
    return `${storeName}创建`;
  }

  return PRODUCT_SOURCE_LABEL_MAP[sourceType];
}
