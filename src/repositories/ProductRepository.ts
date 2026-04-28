import { readPersistentValue, writePersistentValue } from '@/utils/usePersistentState';
import type { ProductItem, ProductSourceType, ProductStoreConfigItem } from '@/types/product';
import { DEFAULT_PRODUCTS } from '@/repositories/product/defaultProducts';
import {
  normalizeBundleComponents,
  normalizeProductCarouselImages,
  normalizeProductKind,
  normalizeProductIndependentPriceRule,
  normalizeProductIndependentStockRule,
  normalizeProductShareTargets,
  normalizeProductStoreChannelRules,
  normalizeProductStoreOverride,
  summarizeProductFromSkus,
  trimProductStoreOverridesBySkus,
} from '@/lib/product';

const PRODUCT_STORAGE_KEY = 'product-items-v2';
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

function normalizeProductItem(product: ProductItem): ProductItem {
  const productKind = normalizeProductKind((product as ProductItem).productKind);
  const sourceType = isProductSourceType(product.sourceType)
    ? product.sourceType
    : 'headquarter';
  const sourceStoreId =
    sourceType === 'store' ? migrateProductStoreId(product.sourceStoreId) : undefined;
  const normalizedSkus = (Array.isArray(product.skus) ? product.skus : []).map((sku) => ({
    ...sku,
    sellStatus:
      sku?.sellStatus === 'unsellable'
        ? ('unsellable' as const)
        : ('sellable' as const),
    status: sku?.status === 'off' ? ('off' as const) : ('on' as const),
  }));
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

  return {
    ...product,
    productKind,
    sourceType,
    sourceStoreId,
    skus: normalizedSkus,
    independentPriceRule: normalizeProductIndependentPriceRule(
      product.independentPriceRule,
      normalizedSkus
    ),
    independentStockRule: normalizeProductIndependentStockRule(
      product.independentStockRule,
      normalizedSkus
    ),
    storeChannelRules: normalizeProductStoreChannelRules(
      product.storeChannelRules,
      normalizedSkus
    ),
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
      productKind === 'bundle' ? normalizedBundleComponents : [],
    shareTargets: normalizedShareTargets,
  };
}

function normalizeProductItems(products: ProductItem[] = DEFAULT_PRODUCTS) {
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
