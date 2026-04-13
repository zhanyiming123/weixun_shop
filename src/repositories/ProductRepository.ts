import { readPersistentValue, writePersistentValue } from '@/utils/usePersistentState';
import type { ProductItem, ProductSourceType, ProductStoreConfigItem } from '@/types/product';
import { DEFAULT_PRODUCTS } from '@/repositories/product/defaultProducts';
import {
  normalizeProductCarouselImages,
  normalizeProductStoreOverride,
} from '@/lib/product';

const PRODUCT_STORAGE_KEY = 'product-items-v2';

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

function normalizeProductItem(product: ProductItem): ProductItem {
  const sourceType = isProductSourceType(product.sourceType)
    ? product.sourceType
    : 'headquarter';
  const sourceStoreId =
    sourceType === 'store' ? migrateProductStoreId(product.sourceStoreId) : undefined;
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

  return {
    ...product,
    sourceType,
    sourceStoreId,
    carouselImages: normalizeProductCarouselImages(product.carouselImages || []),
    storeConfigs: normalizeProductStoreConfigs(
      Array.isArray(product.storeConfigs) ? product.storeConfigs : []
    ),
    storeOverrides,
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
