import { readPersistentValue, writePersistentValue } from '@/utils/usePersistentState';
import type { ProductItem, ProductSourceType, ProductStoreConfigItem } from '@/types/product';
import { DEFAULT_PRODUCTS } from '@/repositories/product/defaultProducts';
import {
  normalizeBundleComponents,
  normalizeProductComboOptions,
  normalizeProductCarouselImages,
  normalizeProductKind,
  normalizeProductIndependentPriceRule,
  normalizeProductIndependentStockRule,
  normalizeProductShareTargets,
  normalizeProductStoreChannelConfig,
  normalizeProductStoreOverride,
  summarizeProductFromSkus,
  trimProductStoreOverridesBySkus,
} from '@/lib/product';

const PRODUCT_STORAGE_KEY = 'product-items-v2';
const DEFAULT_PRODUCT_BY_ID = new Map(DEFAULT_PRODUCTS.map((item) => [item.id, item]));
const RETIRED_SEED_PRODUCT_IDS = new Set([
  'G_1210997383807242240',
  'G_1210876543210987654',
  'G_1210123456789012345',
  'G_1209988776655443322',
  'G_1260408000000000001',
  'G_1260408000000000002',
  'G_1260408000000000003',
  'G_1260408000000000004',
  'G_1260408000000000005',
  'G_1260413000000000001',
  'G_1260413000000000002',
  'G_1260413000000000003',
  'G_1260413000000000004',
  'G_1260414000000000001',
  'G_1260414000000000002',
  'B_1260420000000000001',
  'B_1260420000000000002',
  'B_1260420000000000003',
  'B_1260420000000000004',
  'B_1260420000000000005',
  'B_1260420000000000006',
  'B_1260420000000000007',
  'B_1260420000000000008',
  'B_1260420000000000009',
  'B_1260420000000000010',
]);
const DEFAULT_SHARE_TARGETS_BY_PRODUCT_ID = new Map(
  DEFAULT_PRODUCTS.filter((item) => (item.shareTargets || []).length > 0).map((item) => [
    item.id,
    item.shareTargets || [],
  ])
);
const LEGACY_GUANGZHOU_BUNDLE_SHARE_PRODUCT_IDS = new Set([
  'B_1260420000000000004',
  'B_1260420000000000005',
  'B_1260420000000000006',
  'B_1260420000000000007',
  'B_1260420000000000008',
  'B_1260420000000000009',
  'B_1260420000000000010',
]);

const PRODUCT_STORE_ID_MIGRATION_MAP: Record<string, string> = {
  store_shanghai: 'store_shanghai',
  store_beijing: 'store_beijing',
  store_hangzhou: 'store_chengdu',
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

function normalizeProductStoreConfigs(storeConfigs: ProductStoreConfigItem[] = []) {
  const storeConfigMap = new Map<string, ProductStoreConfigItem>();

  storeConfigs.forEach((item) => {
    const nextStoreId = migrateProductStoreId(item.storeId);
    if (!nextStoreId) {
      return;
    }

    storeConfigMap.set(nextStoreId, {
      ...item,
      storeId: nextStoreId,
    });
  });

  return Array.from(storeConfigMap.values());
}

function cloneShareTargets(targets: NonNullable<ProductItem['shareTargets']> = []) {
  return targets.map((item) => ({
    ...item,
    sellableSkuIds: Array.isArray(item.sellableSkuIds) ? [...item.sellableSkuIds] : undefined,
  }));
}

function normalizeProductSkus(skus: ProductItem['skus'] = []) {
  let hasDefaultSelected = false;

  return (Array.isArray(skus) ? skus : []).map((sku) => {
    const { image: _skuImage, isDefaultSelected: _skuDefault, ...restSku } = sku;
    const image = normalizeProductCarouselImages(sku?.image ? [sku.image] : [])[0];
    const status = sku?.status === 'off' ? ('off' as const) : ('on' as const);
    const isDefaultSelected =
      sku?.isDefaultSelected === true && status === 'on' && !hasDefaultSelected;

    if (isDefaultSelected) {
      hasDefaultSelected = true;
    }

    return {
      ...restSku,
      sellStatus:
        sku?.sellStatus === 'unsellable'
          ? ('unsellable' as const)
          : ('sellable' as const),
      status,
      ...(image ? { image } : {}),
      ...(isDefaultSelected ? { isDefaultSelected: true } : {}),
    };
  });
}

function normalizeProductItem(product: ProductItem): ProductItem {
  const productKind = normalizeProductKind((product as ProductItem).productKind);
  const sourceType = isProductSourceType(product.sourceType)
    ? product.sourceType
    : 'headquarter';
  const sourceStoreId =
    sourceType === 'store' ? migrateProductStoreId(product.sourceStoreId) : undefined;
  const normalizedSkus = normalizeProductSkus(product.skus || []);
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
  const normalizedBundleComponents = normalizeBundleComponents(
    product.bundleComponents || []
  );
  const normalizedComboOptions = normalizeProductComboOptions(
    product.comboOptions || []
  );
  const seedShareTargets =
    DEFAULT_SHARE_TARGETS_BY_PRODUCT_ID.get(product.id) || [];
  const localShareTargets = Array.isArray(product.shareTargets) ? product.shareTargets : [];
  const migratedLocalShareTargets = LEGACY_GUANGZHOU_BUNDLE_SHARE_PRODUCT_IDS.has(product.id)
    ? localShareTargets.filter((item) => item.storeId !== 'store_guangzhou')
    : localShareTargets;
  const rawShareTargets = [
    ...cloneShareTargets(seedShareTargets),
    ...migratedLocalShareTargets,
  ];
  const normalizedShareTargets = normalizeProductShareTargets(rawShareTargets);
  const skuSummary = summarizeProductFromSkus(normalizedSkus);
  const isLimited =
    product.purchaseLimit?.enabled === true || product.isLimited === true;
  const limitCount =
    isLimited &&
    typeof (product.purchaseLimit?.count ?? product.limitCount) === 'number' &&
    Number.isFinite(product.purchaseLimit?.count ?? product.limitCount)
      ? Math.max(1, Math.floor(Number(product.purchaseLimit?.count ?? product.limitCount)))
      : undefined;
  const detailHtml =
    typeof product.detailContent?.html === 'string'
      ? product.detailContent.html
      : typeof product.detailHtml === 'string'
        ? product.detailHtml
        : '';

  return {
    ...product,
    productKind,
    sourceType,
    sourceStoreId,
    isLimited,
    limitCount,
    detailHtml,
    purchaseLimit: isLimited
      ? {
          enabled: true,
          count: limitCount,
        }
      : {
          enabled: false,
        },
    detailContent: {
      html: detailHtml,
      fontSize:
        typeof product.detailContent?.fontSize === 'string' &&
        product.detailContent.fontSize
          ? product.detailContent.fontSize
          : '16',
      lineHeight:
        typeof product.detailContent?.lineHeight === 'string' &&
        product.detailContent.lineHeight
          ? product.detailContent.lineHeight
          : '1.75',
    },
    skus: normalizedSkus,
    independentPriceRule: normalizeProductIndependentPriceRule(
      product.independentPriceRule,
      normalizedSkus
    ),
    independentStockRule: normalizeProductIndependentStockRule(
      product.independentStockRule,
      normalizedSkus
    ),
    storeChannelConfig: normalizeProductStoreChannelConfig(
      product.storeChannelConfig,
      product.storeChannelRules,
      normalizedShareTargets,
      normalizedSkus
    ),
    storeChannelRules: undefined,
    carouselImages: normalizeProductCarouselImages(product.carouselImages || []),
    storeConfigs: normalizeProductStoreConfigs(
      Array.isArray(product.storeConfigs) ? product.storeConfigs : []
    ),
    storeOverrides: trimProductStoreOverridesBySkus(storeOverrides, normalizedSkus),
    price:
      typeof product.price === 'number' && Number.isFinite(product.price)
        ? product.price
        : skuSummary.price,
    stock:
      typeof product.stock === 'number' && Number.isFinite(product.stock)
        ? product.stock
        : skuSummary.stock,
    status: (
      product.status === 'on' || product.status === 'off'
        ? product.status
        : skuSummary.status
    ) as ProductItem['status'],
    bundleComponents:
      productKind === 'bundle' || productKind === 'combo'
        ? normalizedBundleComponents
        : [],
    comboOptions: productKind === 'combo' ? normalizedComboOptions : undefined,
    shareTargets: normalizedShareTargets,
  };
}

function normalizeProductItems(products: ProductItem[] = DEFAULT_PRODUCTS) {
  return products.map((item) => normalizeProductItem(item));
}

function hasItems(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function mergeSeedProductItem(product: ProductItem) {
  const seedProduct = DEFAULT_PRODUCT_BY_ID.get(product.id);

  if (!seedProduct) {
    return product;
  }

  const sourceType = isProductSourceType(product.sourceType)
    ? product.sourceType
    : seedProduct.sourceType;

  return {
    ...seedProduct,
    ...product,
    sourceType,
    sourceStoreId:
      sourceType === 'store'
        ? typeof product.sourceStoreId === 'string' && product.sourceStoreId
          ? product.sourceStoreId
          : seedProduct.sourceStoreId
        : undefined,
    skus: hasItems(product.skus) ? product.skus : seedProduct.skus,
    storeConfigs: hasItems(product.storeConfigs)
      ? product.storeConfigs
      : seedProduct.storeConfigs,
  };
}

function mergeProductSeedItems(products: ProductItem[] = []) {
  const normalizedRawItems = products.filter(
    (item): item is ProductItem => Boolean(item) && typeof item === 'object'
  ).filter(
    (item) => !RETIRED_SEED_PRODUCT_IDS.has(item.id)
  );
  const mergedSeedItems = normalizedRawItems.map((item) => mergeSeedProductItem(item));
  const existingIdSet = new Set(
    mergedSeedItems
      .map((item) => item.id)
      .filter((item): item is string => typeof item === 'string' && Boolean(item))
  );

  return [
    ...mergedSeedItems,
    ...DEFAULT_PRODUCTS.filter((item) => !existingIdSet.has(item.id)),
  ];
}

export class ProductRepository {
  readSnapshot(): ProductItem[] {
    const stored = readPersistentValue<ProductItem[]>(PRODUCT_STORAGE_KEY, DEFAULT_PRODUCTS);
    const rawItems = Array.isArray(stored) ? stored : DEFAULT_PRODUCTS;
    const mergedItems = mergeProductSeedItems(rawItems);
    const normalizedItems = normalizeProductItems(mergedItems);

    if (JSON.stringify(rawItems) !== JSON.stringify(normalizedItems)) {
      writePersistentValue(PRODUCT_STORAGE_KEY, normalizedItems);
    }

    return normalizedItems;
  }

  list(): Promise<ProductItem[]> {
    return Promise.resolve(this.readSnapshot());
  }

  getById(id: string): Promise<ProductItem | null> {
    const item = this.readSnapshot().find((product) => product.id === id) || null;
    return Promise.resolve(item);
  }

  save(items: ProductItem[]): Promise<void> {
    const normalizedItems = normalizeProductItems(items);
    writePersistentValue(PRODUCT_STORAGE_KEY, normalizedItems);
    return Promise.resolve();
  }
}
