import type {
  OrganizationScope,
  ProductBundleComponentItem,
  ProductCarouselImage,
  ProductFilterValues,
  ProductIndependentPriceRule,
  ProductIndependentStockRule,
  ProductKind,
  ProductItem,
  ProductListItem,
  ProductShareStatus,
  ProductShareTargetItem,
  ProductSkuIndependentPriceRule,
  ProductSkuIndependentStockRule,
  ProductSourceType,
  ProductStatus,
  ProductStoreChannelConfigItem,
  ProductStoreChannelProductPoolStoreConfigItem,
  ProductStoreChannelStatus,
  ProductStoreChannelRuleItem,
  ProductStoreChannelShareMode,
  ProductStoreChannelStoreScope,
  ProductStoreSellStatus,
  ProductStoreLocalSkuItem,
  ProductStoreSkuPriceOverrideItem,
  ProductStoreSkuSellStatusOverrideItem,
  ProductStoreSkuStatusOverrideItem,
  ProductStoreSkuStockOverrideItem,
  ProductStoreSkuViewItem,
  ProductStoreOverrideItem,
  ProductStoreOverrideMap,
  ProductStoreConfigItem,
  ProductStoreOverrideMode,
  ProductStorePriceMode,
  ProductStoreStockMode,
} from '@/types/product';
import type { OrganizationItem } from '@/pages/enterprise/organization/data';
import { getOrganizationRegionLabel } from '@/pages/enterprise/organization/data';
import type { ProductStoreItem } from '@/pages/product/store-config/data';

export const DEFAULT_INVENTORY_UNIT = '份';

export const PRODUCT_SOURCE_LABEL_MAP: Record<ProductSourceType, string> = {
  headquarter: '总部创建',
  store: '店铺创建',
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

export const DEFAULT_FILTER_VALUES: ProductFilterValues = {
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
};

const PRODUCT_KIND_SET = new Set<ProductKind>(['standard', 'combo', 'bundle']);
const PRODUCT_SHARE_STATUS_SET = new Set<ProductShareStatus>([
  'pending',
  'referenced',
]);
const PRODUCT_STORE_CHANNEL_STORE_SCOPE_SET = new Set<
  ProductStoreChannelStoreScope
>(['allStores', 'specificStores']);
const PRODUCT_STORE_CHANNEL_SHARE_MODE_SET = new Set<ProductStoreChannelShareMode>([
  'product_pool',
  'shared_pool',
]);

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function createDefaultFilterValues(): ProductFilterValues {
  return {
    ...DEFAULT_FILTER_VALUES,
    sourceStoreIds: [],
    createdAtRange: [],
  };
}

export function normalizeProductKind(value: unknown): ProductKind {
  if (typeof value === 'string' && PRODUCT_KIND_SET.has(value as ProductKind)) {
    return value as ProductKind;
  }

  return 'standard';
}

export function normalizeBundleComponents(
  components?: ProductBundleComponentItem[]
): ProductBundleComponentItem[] {
  if (!Array.isArray(components)) {
    return [];
  }

  const seen = new Set<string>();

  return components.flatMap((item) => {
    const productId =
      typeof item?.productId === 'string' ? item.productId.trim() : '';
    const skuId = typeof item?.skuId === 'string' ? item.skuId.trim() : '';

    if (!productId || !skuId) {
      return [];
    }

    const key = `${productId}:${skuId}`;
    if (seen.has(key)) {
      return [];
    }
    seen.add(key);

    return [{ productId, skuId }];
  });
}

export function normalizeProductShareTargets(
  targets?: ProductShareTargetItem[]
): ProductShareTargetItem[] {
  if (!Array.isArray(targets)) {
    return [];
  }

  const targetMap = new Map<string, ProductShareTargetItem>();

  targets.forEach((item) => {
    const storeId = typeof item?.storeId === 'string' ? item.storeId.trim() : '';
    if (!storeId) {
      return;
    }

    const status =
      typeof item?.status === 'string' &&
      PRODUCT_SHARE_STATUS_SET.has(item.status as ProductShareStatus)
        ? (item.status as ProductShareStatus)
        : 'pending';
    const sharedAt =
      typeof item?.sharedAt === 'string' && item.sharedAt.trim()
        ? item.sharedAt.trim()
        : '';
    const referencedAt =
      typeof item?.referencedAt === 'string' && item.referencedAt.trim()
        ? item.referencedAt.trim()
        : undefined;
    const sellableSkuIds = Array.isArray(item?.sellableSkuIds)
      ? Array.from(
          new Set(
            item.sellableSkuIds
              .filter((skuId): skuId is string => typeof skuId === 'string')
              .map((skuId) => skuId.trim())
              .filter(Boolean)
          )
        )
      : [];

    targetMap.set(storeId, {
      storeId,
      status,
      sharedAt,
      referencedAt: status === 'referenced' ? referencedAt : undefined,
      sellableSkuIds: sellableSkuIds.length ? sellableSkuIds : undefined,
      allowSelfPrice: item?.allowSelfPrice === true ? true : undefined,
    });
  });

  return Array.from(targetMap.values());
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
  storeConfigs: ProductStoreConfigItem[] = [],
  storeIds: string[] = []
) {
  return filterProductStoreConfigsByStoreIds(storeConfigs, storeIds).length > 0;
}

export function getProductStatusByStoreConfigs(
  storeConfigs: ProductStoreConfigItem[] = []
): ProductStatus {
  return storeConfigs.some((item) => item.sellStatus === 'sellable')
    ? 'on'
    : 'off';
}

export function getProductSourceLabel(sourceType: ProductSourceType, storeName?: string) {
  if (sourceType === 'store' && storeName) {
    return `${storeName}创建`;
  }

  return PRODUCT_SOURCE_LABEL_MAP[sourceType];
}

function buildDefaultCarouselImageName(index: number) {
  return `图片${index + 1}`;
}

function isRegionPathPrefix(sourcePath: string[] = [], targetPath: string[] = []) {
  if (!sourcePath.length || sourcePath.length > targetPath.length) {
    return false;
  }

  return sourcePath.every((item, index) => targetPath[index] === item);
}

export function normalizeProductCarouselImages(
  images: ProductCarouselImage[] = []
): ProductCarouselImage[] {
  const seenIds = new Set<string>();

  return images.flatMap((item, index) => {
    if (!item || typeof item.url !== 'string' || !item.url.trim()) {
      return [];
    }

    const rawId =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim()
        : `carousel_${index + 1}`;
    const nextId = seenIds.has(rawId) ? `${rawId}_${index + 1}` : rawId;
    seenIds.add(nextId);

    return [
      {
        id: nextId,
        name:
          typeof item.name === 'string' && item.name.trim()
            ? item.name.trim()
            : buildDefaultCarouselImageName(index),
        url: item.url.trim(),
      },
    ];
  });
}

export function createDefaultProductStoreOverride(
  storeId: string
): ProductStoreOverrideItem {
  return {
    storeId,
    priceMode: 'follow',
    stockMode: 'follow',
    currentPrice: undefined,
    skuPriceOverrides: [],
    skuStockOverrides: [],
    skuSellStatusOverrides: [],
    skuStatusOverrides: [],
    localSkuItems: [],
    nameMode: 'follow',
    overrideName: undefined,
    carouselMode: 'follow',
    overrideCarouselImages: [],
    updatedAt: undefined,
  };
}

export function normalizeProductIndependentPriceRule(
  rule?: ProductIndependentPriceRule,
  skus: Array<{ id: string }> = []
): ProductIndependentPriceRule {
  const skuIdSet = new Set(skus.map((item) => item.id).filter(Boolean));
  const seenSkuIds = new Set<string>();
  const skuRules = (Array.isArray(rule?.skuRules) ? rule.skuRules : []).flatMap(
    (item): ProductSkuIndependentPriceRule[] => {
      const skuId =
        typeof item?.skuId === 'string' && item.skuId.trim()
          ? item.skuId.trim()
          : '';

      if (!skuId || seenSkuIds.has(skuId)) {
        return [];
      }

      if (skuIdSet.size && !skuIdSet.has(skuId)) {
        return [];
      }

      const minPrice =
        typeof item.minPrice === 'number' &&
        Number.isFinite(item.minPrice) &&
        item.minPrice >= 0
          ? item.minPrice
          : undefined;
      const maxPrice =
        typeof item.maxPrice === 'number' &&
        Number.isFinite(item.maxPrice) &&
        item.maxPrice >= 0
          ? item.maxPrice
          : undefined;

      if (
        typeof minPrice === 'number' &&
        typeof maxPrice === 'number' &&
        minPrice > maxPrice
      ) {
        return [];
      }

      seenSkuIds.add(skuId);

      return [
        {
          skuId,
          minPrice,
          maxPrice,
        },
      ];
    }
  );

  return {
    enabled: rule?.enabled !== false,
    skuRules,
  };
}

export function getProductIndependentPriceRule(product: ProductItem) {
  return normalizeProductIndependentPriceRule(
    product.independentPriceRule,
    product.skus || []
  );
}

export function normalizeProductIndependentStockRule(
  rule?: ProductIndependentStockRule,
  skus: Array<{ id: string }> = []
): ProductIndependentStockRule {
  const skuIdSet = new Set(skus.map((item) => item.id).filter(Boolean));
  const seenSkuIds = new Set<string>();
  const skuRules = (Array.isArray(rule?.skuRules) ? rule.skuRules : []).flatMap(
    (item): ProductSkuIndependentStockRule[] => {
      const skuId =
        typeof item?.skuId === 'string' && item.skuId.trim()
          ? item.skuId.trim()
          : '';

      if (!skuId || seenSkuIds.has(skuId)) {
        return [];
      }

      if (skuIdSet.size && !skuIdSet.has(skuId)) {
        return [];
      }

      const minStock =
        typeof item.minStock === 'number' &&
        Number.isFinite(item.minStock) &&
        item.minStock >= 0
          ? Math.floor(item.minStock)
          : undefined;
      const maxStock =
        typeof item.maxStock === 'number' &&
        Number.isFinite(item.maxStock) &&
        item.maxStock >= 0
          ? Math.floor(item.maxStock)
          : undefined;

      if (
        typeof minStock === 'number' &&
        typeof maxStock === 'number' &&
        minStock > maxStock
      ) {
        return [];
      }

      seenSkuIds.add(skuId);

      return [
        {
          skuId,
          minStock,
          maxStock,
        },
      ];
    }
  );

  return {
    enabled: rule?.enabled !== false,
    skuRules,
  };
}

export function getProductIndependentStockRule(product: ProductItem) {
  return normalizeProductIndependentStockRule(
    product.independentStockRule,
    product.skus || []
  );
}

function normalizeProductStoreChannelProductPoolStoreConfigs(
  configs?: ProductStoreChannelProductPoolStoreConfigItem[],
  skus: Array<{ id: string }> = [],
  storeIds: string[] = []
) {
  if (!Array.isArray(configs)) {
    return [];
  }

  const skuIdSet = new Set(skus.map((item) => item.id).filter(Boolean));
  const storeIdSet = new Set(storeIds.filter(Boolean));
  const configMap = new Map<string, ProductStoreChannelProductPoolStoreConfigItem>();

  configs.forEach((item) => {
    const storeId =
      typeof item?.storeId === 'string' ? item.storeId.trim() : '';

    if (!storeId || configMap.has(storeId) || (storeIdSet.size && !storeIdSet.has(storeId))) {
      return;
    }

    const sellableSkuIds = Array.isArray(item?.sellableSkuIds)
      ? uniqueStringArray(
          item.sellableSkuIds
            .filter((skuId): skuId is string => typeof skuId === 'string')
            .map((skuId) => skuId.trim())
            .filter((skuId) => !skuIdSet.size || skuIdSet.has(skuId))
        )
      : [];
    const isSellable = item?.sellStatus === 'sellable' && sellableSkuIds.length > 0;
    const channelStatus =
      isSellable ? ('on' as ProductStoreChannelStatus) : ('off' as ProductStoreChannelStatus);

    configMap.set(storeId, {
      storeId,
      sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
      channelStatus,
      ...(isSellable ? { sellableSkuIds } : {}),
      ...(isSellable && item?.allowSelfPrice === true ? { allowSelfPrice: true } : {}),
    });
  });

  return Array.from(configMap.values());
}

function convertLegacyStoreChannelRuleToConfig(
  rule: ProductStoreChannelRuleItem | undefined,
  shareTargets: ProductShareTargetItem[] = [],
  skus: Array<{ id: string }> = []
): ProductStoreChannelConfigItem | undefined {
  if (!rule) {
    return undefined;
  }

  const shareMode = PRODUCT_STORE_CHANNEL_SHARE_MODE_SET.has(
    rule.shareMode as ProductStoreChannelShareMode
  )
    ? (rule.shareMode as ProductStoreChannelShareMode)
    : 'product_pool';
  const storeScope = PRODUCT_STORE_CHANNEL_STORE_SCOPE_SET.has(
    rule.storeScope as ProductStoreChannelStoreScope
  )
    ? (rule.storeScope as ProductStoreChannelStoreScope)
    : 'allStores';
  const normalizedStoreIds = Array.isArray(rule.storeIds)
    ? uniqueStringArray(
        rule.storeIds
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
      )
    : [];

  if (shareMode !== 'product_pool') {
    return {
      shareMode,
      storeScope,
      storeIds: storeScope === 'specificStores' ? normalizedStoreIds : [],
      productPoolStoreConfigs: [],
    };
  }

  const shareTargetMap = new Map(
    normalizeProductShareTargets(shareTargets).map((item) => [item.storeId, item])
  );
  const skuIdSet = new Set(skus.map((item) => item.id).filter(Boolean));
  const productPoolStoreConfigs = normalizedStoreIds.map((storeId) => {
    const shareTarget = shareTargetMap.get(storeId);
    const sellableSkuIds = uniqueStringArray(
      (shareTarget?.sellableSkuIds || []).filter(
        (skuId) => !skuIdSet.size || skuIdSet.has(skuId)
      )
    );
    const isSellable = sellableSkuIds.length > 0;

    return {
      storeId,
      sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
      channelStatus: 'off' as const,
      ...(isSellable ? { sellableSkuIds } : {}),
      ...(isSellable && shareTarget?.allowSelfPrice === true
        ? { allowSelfPrice: true }
        : {}),
    };
  });

  return {
    shareMode,
    storeScope: 'specificStores',
    storeIds: normalizedStoreIds,
    productPoolStoreConfigs,
  };
}

export function normalizeProductStoreChannelConfig(
  config?: ProductStoreChannelConfigItem,
  legacyRules?: ProductStoreChannelRuleItem[],
  shareTargets: ProductShareTargetItem[] = [],
  skus: Array<{ id: string }> = [],
  storeIds: string[] = []
): ProductStoreChannelConfigItem | undefined {
  const rawConfig =
    config && typeof config === 'object'
      ? config
      : convertLegacyStoreChannelRuleToConfig(
          Array.isArray(legacyRules) ? legacyRules[0] : undefined,
          shareTargets,
          skus
        );

  if (!rawConfig) {
    return undefined;
  }

  const shareMode = PRODUCT_STORE_CHANNEL_SHARE_MODE_SET.has(
    rawConfig.shareMode as ProductStoreChannelShareMode
  )
    ? (rawConfig.shareMode as ProductStoreChannelShareMode)
    : 'product_pool';
  const storeScope = PRODUCT_STORE_CHANNEL_STORE_SCOPE_SET.has(
    rawConfig.storeScope as ProductStoreChannelStoreScope
  )
    ? (rawConfig.storeScope as ProductStoreChannelStoreScope)
    : 'allStores';
  const allowedStoreIdSet = new Set(storeIds.filter(Boolean));
  const normalizedStoreIds = Array.isArray(rawConfig.storeIds)
    ? uniqueStringArray(
        rawConfig.storeIds
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => !allowedStoreIdSet.size || allowedStoreIdSet.has(value))
      )
    : [];
  const productPoolStoreConfigs = normalizeProductStoreChannelProductPoolStoreConfigs(
    rawConfig.productPoolStoreConfigs,
    skus,
    storeIds
  );
  const productPoolStoreIds = uniqueStringArray(
    productPoolStoreConfigs
      .filter((item) => item.sellStatus === 'sellable')
      .map((item) => item.storeId)
  );

  return {
    shareMode,
    storeScope: shareMode === 'product_pool' ? 'specificStores' : storeScope,
    storeIds:
      shareMode === 'product_pool'
        ? productPoolStoreIds.length
          ? productPoolStoreIds
          : normalizedStoreIds
        : storeScope === 'specificStores'
          ? normalizedStoreIds
          : [],
    productPoolStoreConfigs:
      shareMode === 'product_pool' ? productPoolStoreConfigs : [],
  };
}

export function getProductStoreChannelConfig(product: ProductItem) {
  return normalizeProductStoreChannelConfig(
    product.storeChannelConfig,
    product.storeChannelRules,
    product.shareTargets,
    product.skus || []
  );
}

export function getMatchedProductStoreChannelConfig(
  product: ProductItem,
  storeId: string | undefined
) {
  if (!storeId) {
    return undefined;
  }

  if (product.sourceType === 'store' && product.sourceStoreId === storeId) {
    return undefined;
  }

  const sharedStoreIdSet = new Set(
    (product.shareTargets || []).map((item) => item.storeId).filter(Boolean)
  );

  if (product.sourceType === 'store' && !sharedStoreIdSet.has(storeId)) {
    return undefined;
  }

  const config = getProductStoreChannelConfig(product);

  if (!config) {
    return undefined;
  }

  const storeMatched =
    config.shareMode === 'product_pool'
      ? config.storeIds.includes(storeId)
      : config.storeScope === 'allStores'
        ? !sharedStoreIdSet.size || sharedStoreIdSet.has(storeId)
        : config.storeIds.includes(storeId);

  return storeMatched ? config : undefined;
}

export function getProductSkuIndependentPriceRule(
  product: ProductItem,
  skuId: string
) {
  return getProductIndependentPriceRule(product).skuRules.find(
    (item) => item.skuId === skuId
  );
}

export function getProductSkuIndependentStockRule(
  product: ProductItem,
  skuId: string
) {
  return getProductIndependentStockRule(product).skuRules.find(
    (item) => item.skuId === skuId
  );
}

export function normalizeProductStoreSkuPriceOverrides(
  skuPriceOverrides?: ProductStoreSkuPriceOverrideItem[]
) {
  if (!Array.isArray(skuPriceOverrides)) {
    return [];
  }

  const overrideMap = new Map<string, ProductStoreSkuPriceOverrideItem>();

  skuPriceOverrides.forEach((item) => {
    if (!item || typeof item.skuId !== 'string' || !item.skuId.trim()) {
      return;
    }

    if (
      typeof item.currentPrice !== 'number' ||
      !Number.isFinite(item.currentPrice) ||
      item.currentPrice < 0
    ) {
      return;
    }

    overrideMap.set(item.skuId, {
      skuId: item.skuId.trim(),
      currentPrice: item.currentPrice,
    });
  });

  return Array.from(overrideMap.values());
}

export function normalizeProductStoreSkuStockOverrides(
  skuStockOverrides?: ProductStoreSkuStockOverrideItem[]
) {
  if (!Array.isArray(skuStockOverrides)) {
    return [];
  }

  const overrideMap = new Map<string, ProductStoreSkuStockOverrideItem>();

  skuStockOverrides.forEach((item) => {
    if (!item || typeof item.skuId !== 'string' || !item.skuId.trim()) {
      return;
    }

    if (
      typeof item.currentStock !== 'number' ||
      !Number.isFinite(item.currentStock) ||
      item.currentStock < 0
    ) {
      return;
    }

    overrideMap.set(item.skuId, {
      skuId: item.skuId.trim(),
      currentStock: Math.floor(item.currentStock),
    });
  });

  return Array.from(overrideMap.values());
}

export function normalizeProductStoreSkuStatusOverrides(
  skuStatusOverrides?: ProductStoreSkuStatusOverrideItem[]
) {
  if (!Array.isArray(skuStatusOverrides)) {
    return [];
  }

  const overrideMap = new Map<string, ProductStoreSkuStatusOverrideItem>();

  skuStatusOverrides.forEach((item) => {
    if (!item || typeof item.skuId !== 'string' || !item.skuId.trim()) {
      return;
    }

    if (item.currentStatus !== 'on' && item.currentStatus !== 'off') {
      return;
    }

    overrideMap.set(item.skuId, {
      skuId: item.skuId.trim(),
      currentStatus: item.currentStatus,
    });
  });

  return Array.from(overrideMap.values());
}

export function normalizeProductStoreSkuSellStatusOverrides(
  skuSellStatusOverrides?: ProductStoreSkuSellStatusOverrideItem[]
) {
  if (!Array.isArray(skuSellStatusOverrides)) {
    return [];
  }

  const overrideMap = new Map<string, ProductStoreSkuSellStatusOverrideItem>();

  skuSellStatusOverrides.forEach((item) => {
    if (!item || typeof item.skuId !== 'string' || !item.skuId.trim()) {
      return;
    }

    if (
      item.currentSellStatus !== 'sellable' &&
      item.currentSellStatus !== 'unsellable'
    ) {
      return;
    }

    overrideMap.set(item.skuId, {
      skuId: item.skuId.trim(),
      currentSellStatus: item.currentSellStatus,
    });
  });

  return Array.from(overrideMap.values());
}

export function normalizeProductStoreLocalSkuItems(
  localSkuItems?: ProductStoreLocalSkuItem[],
  skus: Array<{ id: string; specText?: string }> = []
) {
  if (!Array.isArray(localSkuItems)) {
    return [];
  }

  const sourceSkuIdSet = new Set(
    skus.map((item) => item.id).filter((item): item is string => Boolean(item))
  );
  const sourceSpecTextSet = new Set(
    skus
      .map((item) =>
        typeof item.specText === 'string' ? item.specText.trim() : ''
      )
      .filter(Boolean)
  );
  const seenSkuIds = new Set<string>();
  const seenSpecTexts = new Set<string>();
  let hasDefaultSelected = false;

  return localSkuItems.flatMap((item): ProductStoreLocalSkuItem[] => {
    const skuId =
      typeof item?.skuId === 'string' && item.skuId.trim() ? item.skuId.trim() : '';
    const specText =
      typeof item?.specText === 'string' && item.specText.trim()
        ? item.specText.trim()
        : '';

    if (
      !skuId ||
      seenSkuIds.has(skuId) ||
      sourceSkuIdSet.has(skuId) ||
      !specText ||
      seenSpecTexts.has(specText) ||
      sourceSpecTextSet.has(specText)
    ) {
      return [];
    }

    const price =
      typeof item?.price === 'number' &&
      Number.isFinite(item.price) &&
      item.price >= 0
        ? item.price
        : undefined;
    const stock =
      typeof item?.stock === 'number' &&
      Number.isFinite(item.stock) &&
      item.stock >= 0
        ? Math.floor(item.stock)
        : undefined;

    if (typeof price !== 'number' || typeof stock !== 'number') {
      return [];
    }

    const sellStatus =
      item?.sellStatus === 'unsellable' ? 'unsellable' : 'sellable';
    const status = item?.status === 'off' ? 'off' : 'on';
    const image = normalizeProductCarouselImages(item?.image ? [item.image] : [])[0];
    const isDefaultSelected =
      item?.isDefaultSelected === true && status === 'on' && !hasDefaultSelected;

    seenSkuIds.add(skuId);
    seenSpecTexts.add(specText);
    if (isDefaultSelected) {
      hasDefaultSelected = true;
    }

    return [
      {
        skuId,
        specText,
        price,
        stock,
        sellStatus,
        status,
        ...(image ? { image } : {}),
        ...(isDefaultSelected ? { isDefaultSelected: true } : {}),
      },
    ];
  });
}

export function normalizeProductStoreOverride(
  storeId: string,
  override?: Partial<ProductStoreOverrideItem>,
  skus: Array<{ id: string; specText?: string }> = []
): ProductStoreOverrideItem {
  const priceMode: ProductStorePriceMode =
    override?.priceMode === 'independent' ? 'independent' : 'follow';
  const stockMode: ProductStoreStockMode =
    override?.stockMode === 'independent' ? 'independent' : 'follow';
  const nameMode: ProductStoreOverrideMode =
    override?.nameMode === 'override' ? 'override' : 'follow';
  const carouselMode: ProductStoreOverrideMode =
    override?.carouselMode === 'override' ? 'override' : 'follow';
  const currentPrice =
    typeof override?.currentPrice === 'number' && Number.isFinite(override.currentPrice)
      ? override.currentPrice
      : undefined;
  const skuPriceOverrides = normalizeProductStoreSkuPriceOverrides(
    override?.skuPriceOverrides
  );
  const skuStockOverrides = normalizeProductStoreSkuStockOverrides(
    override?.skuStockOverrides
  );
  const skuSellStatusOverrides = normalizeProductStoreSkuSellStatusOverrides(
    override?.skuSellStatusOverrides
  );
  const skuStatusOverrides = normalizeProductStoreSkuStatusOverrides(
    override?.skuStatusOverrides
  );
  const localSkuItems = normalizeProductStoreLocalSkuItems(
    override?.localSkuItems,
    skus
  );
  const overrideName =
    typeof override?.overrideName === 'string' && override.overrideName.trim()
      ? override.overrideName.trim()
      : undefined;

  return {
    ...createDefaultProductStoreOverride(storeId),
    ...override,
    storeId,
    priceMode,
    stockMode,
    currentPrice,
    skuPriceOverrides,
    skuStockOverrides,
    skuSellStatusOverrides,
    skuStatusOverrides,
    localSkuItems,
    nameMode,
    overrideName,
    carouselMode,
    overrideCarouselImages: normalizeProductCarouselImages(
      Array.isArray(override?.overrideCarouselImages)
        ? override.overrideCarouselImages
        : []
    ),
    updatedAt:
      typeof override?.updatedAt === 'string' && override.updatedAt
        ? override.updatedAt
        : undefined,
  };
}

export function normalizeProductStoreOverrides(
  storeOverrides?: ProductStoreOverrideMap,
  skus: Array<{ id: string; specText?: string }> = []
): ProductStoreOverrideMap {
  if (!storeOverrides || typeof storeOverrides !== 'object') {
    return {};
  }

  return Object.entries(storeOverrides).reduce<ProductStoreOverrideMap>(
    (result, [storeId, override]) => {
      if (!storeId) {
        return result;
      }

      result[storeId] = normalizeProductStoreOverride(
        storeId,
        override as ProductStoreOverrideItem,
        skus
      );
      return result;
    },
    {}
  );
}

export function trimProductStoreOverridesBySkus(
  storeOverrides: ProductStoreOverrideMap = {},
  skus: Array<{ id: string; specText?: string }> = []
) {
  const skuIdSet = new Set(skus.map((item) => item.id).filter(Boolean));

  return Object.entries(storeOverrides).reduce<ProductStoreOverrideMap>(
    (result, [storeId, override]) => {
      const normalized = normalizeProductStoreOverride(storeId, override, skus);

      result[storeId] = {
        ...normalized,
        skuPriceOverrides: (normalized.skuPriceOverrides || []).filter((item) =>
          skuIdSet.has(item.skuId)
        ),
        skuStockOverrides: (normalized.skuStockOverrides || []).filter((item) =>
          skuIdSet.has(item.skuId)
        ),
        skuSellStatusOverrides: (normalized.skuSellStatusOverrides || []).filter((item) =>
          skuIdSet.has(item.skuId)
        ),
        skuStatusOverrides: (normalized.skuStatusOverrides || []).filter((item) =>
          skuIdSet.has(item.skuId)
        ),
      };
      return result;
    },
    {}
  );
}

export function getProductStoreOverride(
  product: ProductItem,
  storeId?: string
): ProductStoreOverrideItem | undefined {
  if (!storeId) {
    return undefined;
  }

  const override = product.storeOverrides?.[storeId];
  return override
    ? normalizeProductStoreOverride(storeId, override, product.skus || [])
    : undefined;
}

export function hasProductStoreSetting(override?: ProductStoreOverrideItem) {
  if (!override) {
    return false;
  }

  return (
    override.priceMode === 'independent' ||
    override.stockMode === 'independent' ||
    override.nameMode === 'override' ||
    override.carouselMode === 'override' ||
    Boolean(override.skuSellStatusOverrides?.length) ||
    Boolean(override.skuStatusOverrides?.length) ||
    Boolean(override.localSkuItems?.length)
  );
}

function getProductSkuOverridePrice(
  override: ProductStoreOverrideItem | undefined,
  skuId: string
) {
  return (
    override?.skuPriceOverrides?.find((item) => item.skuId === skuId)?.currentPrice
  );
}

function getProductSkuOverrideStock(
  override: ProductStoreOverrideItem | undefined,
  skuId: string
) {
  return (
    override?.skuStockOverrides?.find((item) => item.skuId === skuId)?.currentStock
  );
}

function getProductSkuOverrideSellStatus(
  override: ProductStoreOverrideItem | undefined,
  skuId: string
) {
  return (
    override?.skuSellStatusOverrides?.find((item) => item.skuId === skuId)
      ?.currentSellStatus
  );
}

function getProductSkuOverrideStatus(
  override: ProductStoreOverrideItem | undefined,
  skuId: string
) {
  return (
    override?.skuStatusOverrides?.find((item) => item.skuId === skuId)?.currentStatus
  );
}

function buildProductStoreLocalSkuViewItems(
  override: ProductStoreOverrideItem | undefined
): ProductStoreSkuViewItem[] {
  let hasDefaultSelected = false;

  return (override?.localSkuItems || []).map((item) => {
    const currentSellStatus =
      item.sellStatus === 'unsellable' ? 'unsellable' : 'sellable';
    const currentStatus = currentSellStatus === 'sellable' ? 'on' : 'off';
    const isDefaultSelected =
      item.isDefaultSelected === true && currentStatus === 'on' && !hasDefaultSelected;

    if (isDefaultSelected) {
      hasDefaultSelected = true;
    }

    return {
      id: item.skuId,
      specText: item.specText,
      stock: item.stock,
      sellStatus: currentSellStatus,
      status: currentStatus,
      ...(item.image ? { image: { ...item.image } } : {}),
      ...(isDefaultSelected ? { isDefaultSelected: true } : {}),
      isLocalSku: true,
      originalStock: item.stock,
      currentStock: item.stock,
      originalSellStatus: currentSellStatus,
      currentSellStatus,
      originalStatus: item.status,
      currentStatus,
      originalPrice: item.price,
      currentPrice: item.price,
      minIndependentPrice: undefined,
      maxIndependentPrice: undefined,
      minIndependentStock: undefined,
      maxIndependentStock: undefined,
    };
  });
}

function getProductSkuSourceSellStatus(
  sku: { sellStatus?: ProductStoreSellStatus } | undefined
) {
  return sku?.sellStatus === 'unsellable' ? 'unsellable' : 'sellable';
}

function getProductSkuSourceStatus(status: ProductStatus | undefined): ProductStatus {
  return status === 'off' ? 'off' : 'on';
}

export function getProductSkuBaselineSellStatus(
  product: ProductItem,
  skuId: string,
  storeId?: string
): ProductStoreSellStatus {
  const sourceSellStatus = getProductSkuSourceSellStatus(
    (product.skus || []).find((item) => item.id === skuId)
  );
  const shareTarget = storeId ? getProductShareTargetByStoreId(product, storeId) : undefined;

  if (
    shareTarget?.status === 'referenced' &&
    Array.isArray(shareTarget.sellableSkuIds) &&
    shareTarget.sellableSkuIds.length &&
    !shareTarget.sellableSkuIds.includes(skuId)
  ) {
    return 'unsellable';
  }

  return sourceSellStatus;
}

function canStoreUseIndependentPrice(product: ProductItem, storeId?: string) {
  if (!storeId) {
    return false;
  }

  if (getProductIndependentPriceRule(product).enabled) {
    return true;
  }

  return getProductShareTargetByStoreId(product, storeId)?.allowSelfPrice === true;
}

export function getProductCurrentSkus(
  product: ProductItem,
  storeId?: string
): ProductStoreSkuViewItem[] {
  const override = getProductStoreOverride(product, storeId);
  const independentPriceRule = getProductIndependentPriceRule(product);
  const independentStockRule = getProductIndependentStockRule(product);
  const canManageIndependentPrice = canStoreUseIndependentPrice(product, storeId);

  const sourceSkus = (product.skus || []).map((sku) => {
    const overridePrice = getProductSkuOverridePrice(override, sku.id);
    const overrideStock = getProductSkuOverrideStock(override, sku.id);
    const overrideSellStatus = getProductSkuOverrideSellStatus(override, sku.id);
    const overrideStatus = getProductSkuOverrideStatus(override, sku.id);
    const skuPriceRule = getProductSkuIndependentPriceRule(product, sku.id);
    const skuStockRule = independentStockRule.skuRules.find((item) => item.skuId === sku.id);
    const originalSellStatus = getProductSkuBaselineSellStatus(product, sku.id, storeId);
    const currentPrice =
      canManageIndependentPrice &&
      override?.priceMode === 'independent' &&
      typeof overridePrice === 'number' &&
      Number.isFinite(overridePrice)
        ? overridePrice
        : canManageIndependentPrice &&
            override?.priceMode === 'independent' &&
            product.specMode !== 'multi' &&
            typeof override.currentPrice === 'number' &&
            Number.isFinite(override.currentPrice)
          ? override.currentPrice
          : sku.price;
    const currentStock =
      override?.stockMode === 'independent' &&
      typeof overrideStock === 'number' &&
      Number.isFinite(overrideStock)
        ? Math.max(0, Math.floor(overrideStock))
        : sku.stock;
    const currentSellStatus =
      overrideSellStatus === 'unsellable' || overrideSellStatus === 'sellable'
        ? overrideSellStatus
        : originalSellStatus;
    const originalStatus =
      originalSellStatus === 'sellable'
        ? getProductSkuSourceStatus(sku.status)
        : 'off';
    const currentStatus =
      currentSellStatus === 'sellable'
        ? getProductSkuSourceStatus(sku.status)
        : 'off';

    return {
      id: sku.id,
      specText: sku.specText,
      stock: currentStock,
      sellStatus: currentSellStatus,
      status: currentStatus,
      originalStock: sku.stock,
      currentStock,
      originalSellStatus,
      currentSellStatus,
      originalStatus,
      currentStatus,
      originalPrice: sku.price,
      currentPrice,
      minIndependentPrice: skuPriceRule?.minPrice,
      maxIndependentPrice: skuPriceRule?.maxPrice,
      minIndependentStock: skuStockRule?.minStock,
      maxIndependentStock: skuStockRule?.maxStock,
      isLocalSku: false,
    };
  });

  if (!storeId) {
    return sourceSkus;
  }

  return [...sourceSkus, ...buildProductStoreLocalSkuViewItems(override)];
}

export function getProductCurrentPrice(product: ProductItem, storeId?: string) {
  const currentSkuPrices = getProductCurrentSkus(product, storeId)
    .map((item) => item.currentPrice)
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (currentSkuPrices.length) {
    return Math.min(...currentSkuPrices);
  }

  return product.price;
}

export function getProductCurrentName(product: ProductItem, storeId?: string) {
  const override = getProductStoreOverride(product, storeId);

  if (override?.nameMode === 'override' && override.overrideName) {
    return override.overrideName;
  }

  return product.name;
}

export function getProductCurrentCarouselImages(
  product: ProductItem,
  storeId?: string
) {
  const override = getProductStoreOverride(product, storeId);

  if (override?.carouselMode === 'override') {
    return override.overrideCarouselImages;
  }

  return normalizeProductCarouselImages(product.carouselImages || []);
}

export function getProductCurrentStoreId(
  organizationScope: OrganizationScope,
  visibleStoreIds: string[]
) {
  if (organizationScope !== 'store' || visibleStoreIds.length !== 1) {
    return undefined;
  }

  return visibleStoreIds[0];
}

export function getProductResolvedSourceStoreId(
  product: ProductItem,
  storeItems: ProductStoreItem[] = []
) {
  const physicalStoreIdSet = new Set(
    storeItems.filter((item) => item.type === 'store').map((item) => item.id)
  );

  if (product.sourceStoreId && physicalStoreIdSet.has(product.sourceStoreId)) {
    return product.sourceStoreId;
  }

  const fallbackPhysicalStoreId = (product.storeConfigs || []).find((item) =>
    physicalStoreIdSet.has(item.storeId)
  )?.storeId;

  if (fallbackPhysicalStoreId) {
    return fallbackPhysicalStoreId;
  }

  const storeIdSet = new Set(storeItems.map((item) => item.id));
  if (product.sourceStoreId && storeIdSet.has(product.sourceStoreId)) {
    return product.sourceStoreId;
  }

  return (product.storeConfigs || []).find((item) => storeIdSet.has(item.storeId))?.storeId;
}

export function resolveSourceStoreMetaById(
  storeId: string | undefined,
  storeItems: ProductStoreItem[] = [],
  organizationItems: OrganizationItem[] = []
) {
  if (!storeId) {
    return {
      sourceStoreName: '',
      sourceRegionName: '',
    };
  }

  const matchedStore = storeItems.find((item) => item.id === storeId);
  const enabledOrganizations = organizationItems.filter((item) => item.status === 'enabled');
  const matchedStoreOrganization = enabledOrganizations.find(
    (item) => item.type === 'store' && item.selectedStoreIds.includes(storeId)
  );
  const matchedRegionOrganization =
    matchedStoreOrganization &&
    enabledOrganizations
      .filter((item) => item.type === 'partner')
      .filter((item) =>
        isRegionPathPrefix(item.regionPath, matchedStoreOrganization.regionPath)
      )
      .sort((left, right) => right.regionPath.length - left.regionPath.length)[0];

  return {
    sourceStoreName: matchedStore?.name || matchedStoreOrganization?.name || '',
    sourceRegionName:
      matchedRegionOrganization?.name ||
      matchedStoreOrganization?.regionLabel ||
      getOrganizationRegionLabel(matchedStoreOrganization?.regionPath || []),
  };
}

export function resolveProductSourceStoreMeta(
  product: ProductItem,
  storeItems: ProductStoreItem[] = [],
  organizationItems: OrganizationItem[] = []
) {
  const resolvedSourceStoreId = getProductResolvedSourceStoreId(product, storeItems);
  const sourceMeta = resolveSourceStoreMetaById(
    resolvedSourceStoreId,
    storeItems,
    organizationItems
  );

  return {
    resolvedSourceStoreId,
    ...sourceMeta,
  };
}

export function getProductStoreSourceLabel(
  product: ProductItem,
  organizationScope: OrganizationScope,
  visibleStoreIds: string[]
) {
  const currentStoreId = getProductCurrentStoreId(organizationScope, visibleStoreIds);

  if (!currentStoreId) {
    return PRODUCT_SOURCE_LABEL_MAP[product.sourceType];
  }

  if (product.sourceType === 'headquarter') {
    return '总部共享';
  }

  return product.sourceStoreId === currentStoreId ? '本店自建' : '店铺共享';
}

export function getProductShareTargetByStoreId(
  product: ProductItem,
  storeId?: string
) {
  if (!storeId) {
    return undefined;
  }

  return normalizeProductShareTargets(product.shareTargets || []).find(
    (item) => item.storeId === storeId
  );
}

export function getProductReferencedStoreIds(product: ProductItem) {
  return normalizeProductShareTargets(product.shareTargets || [])
    .filter((item) => item.status === 'referenced')
    .map((item) => item.storeId);
}

export function hasProductShareTarget(
  product: ProductItem,
  storeId: string,
  status?: ProductShareStatus
) {
  const target = getProductShareTargetByStoreId(product, storeId);
  if (!target) {
    return false;
  }

  return status ? target.status === status : true;
}

export function getProductBundleComponents(product: ProductItem) {
  if (product.productKind !== 'bundle') {
    return [];
  }

  return normalizeBundleComponents(product.bundleComponents || []).slice(0, 2);
}

export function resolveBundleAvailability(
  bundleProduct: ProductItem,
  allProducts: ProductItem[] = []
) {
  const components = getProductBundleComponents(bundleProduct);

  if (components.length !== 2) {
    return {
      stock: 0,
      sellable: false,
      reason: 'missing-components',
    };
  }

  let minStock = Number.MAX_SAFE_INTEGER;
  let sellable = true;

  components.forEach((component) => {
    const componentProduct = allProducts.find((item) => item.id === component.productId);
    if (!componentProduct || componentProduct.productKind !== 'standard') {
      sellable = false;
      minStock = 0;
      return;
    }

    const sourceStoreId = componentProduct.sourceStoreId;
    const sourceStoreConfig = sourceStoreId
      ? componentProduct.storeConfigs.find((item) => item.storeId === sourceStoreId)
      : undefined;
    const sourceSku = getProductCurrentSkus(componentProduct, sourceStoreId).find(
      (item) => item.id === component.skuId
    );

    if (!sourceStoreConfig || sourceStoreConfig.sellStatus !== 'sellable') {
      sellable = false;
    }

    if (!sourceSku || sourceSku.currentStatus !== 'on') {
      sellable = false;
    }

    const nextStock =
      typeof sourceSku?.currentStock === 'number' && Number.isFinite(sourceSku.currentStock)
        ? Math.max(0, Math.floor(sourceSku.currentStock))
        : 0;
    minStock = Math.min(minStock, nextStock);
  });

  return {
    stock: minStock === Number.MAX_SAFE_INTEGER ? 0 : minStock,
    sellable,
    reason: sellable ? '' : 'component-unavailable',
  };
}

export function applyBundleRuntime(
  product: ProductItem,
  allProducts: ProductItem[] = []
): ProductItem {
  if (product.productKind !== 'bundle') {
    return product;
  }

  const bundleState = resolveBundleAvailability(product, allProducts);
  const nextSkus = (product.skus || []).map((sku) => ({
    ...sku,
    stock: bundleState.stock,
    sellStatus:
      bundleState.sellable && sku.sellStatus !== 'unsellable'
        ? ('sellable' as const)
        : ('unsellable' as const),
    status: bundleState.sellable ? sku.status : 'off',
  }));
  const nextStoreConfigs = (product.storeConfigs || []).map((config) =>
    bundleState.sellable
      ? config
      : {
          ...config,
          sellStatus: 'unsellable' as const,
          channelStatus: 'off' as const,
        }
  );

  return {
    ...product,
    skus: nextSkus,
    stock: bundleState.stock,
    status: getProductStatusByStoreConfigs(nextStoreConfigs),
    storeConfigs: nextStoreConfigs,
  };
}

export function syncReferencedStoreConfigsBySourceSellStatus(
  previousProduct: ProductItem,
  nextProduct: ProductItem
) {
  const sourceStoreId = nextProduct.sourceStoreId;
  if (!sourceStoreId) {
    return nextProduct;
  }

  const referencedStoreIdSet = new Set(getProductReferencedStoreIds(nextProduct));
  if (!referencedStoreIdSet.size) {
    return nextProduct;
  }

  const previousSourceStoreConfig = (previousProduct.storeConfigs || []).find(
    (item) => item.storeId === sourceStoreId
  );
  const nextSourceStoreConfig = (nextProduct.storeConfigs || []).find(
    (item) => item.storeId === sourceStoreId
  );

  if (!nextSourceStoreConfig) {
    return nextProduct;
  }

  const sourceSellStatusChanged =
    previousSourceStoreConfig?.sellStatus !== nextSourceStoreConfig.sellStatus;
  if (!sourceSellStatusChanged) {
    return nextProduct;
  }

  const nextStoreConfigs = (nextProduct.storeConfigs || []).map((config) => {
    if (!referencedStoreIdSet.has(config.storeId)) {
      return config;
    }

    if (nextSourceStoreConfig.sellStatus === 'unsellable') {
      return {
        ...config,
        sellStatus: 'unsellable' as const,
        channelStatus: 'off' as const,
      };
    }

    return {
      ...config,
      sellStatus: 'sellable' as const,
      channelStatus: 'on' as const,
    };
  });

  return {
    ...nextProduct,
    storeConfigs: nextStoreConfigs,
    status: getProductStatusByStoreConfigs(nextStoreConfigs),
  };
}

export function upsertPendingShareTargets(
  product: ProductItem,
  targetStoreIds: string[],
  sharedAt: string
) {
  const targetStoreIdSet = new Set(targetStoreIds.filter(Boolean));
  const nextTargets = normalizeProductShareTargets(product.shareTargets || []).map((item) => ({
    ...item,
  }));
  const targetIndexMap = new Map(nextTargets.map((item, index) => [item.storeId, index]));

  targetStoreIdSet.forEach((storeId) => {
    const matchedIndex = targetIndexMap.get(storeId);
    if (typeof matchedIndex === 'number') {
      if (nextTargets[matchedIndex].status === 'referenced') {
        return;
      }

      nextTargets[matchedIndex] = {
        ...nextTargets[matchedIndex],
        status: 'pending',
        sharedAt,
        referencedAt: undefined,
      };
      return;
    }

    nextTargets.push({
      storeId,
      status: 'pending',
      sharedAt,
    });
  });

  return {
    ...product,
    shareTargets: nextTargets,
  };
}

export function markShareTargetReferenced(
  product: ProductItem,
  storeId: string,
  referencedAt: string
) {
  const nextTargets = normalizeProductShareTargets(product.shareTargets || []).map((item) =>
    item.storeId === storeId
      ? {
          ...item,
          status: 'referenced' as const,
          referencedAt,
        }
      : item
  );

  return {
    ...product,
    shareTargets: nextTargets,
  };
}

export function markShareTargetPending(
  product: ProductItem,
  storeId: string
) {
  const nextTargets = normalizeProductShareTargets(product.shareTargets || []).map((item) =>
    item.storeId === storeId
      ? {
          ...item,
          status: 'pending' as const,
          referencedAt: undefined,
        }
      : item
  );

  return {
    ...product,
    shareTargets: nextTargets,
  };
}

export function summarizeProductFromSkus(
  skus: Array<{
    price: number;
    stock: number;
    status: ProductStatus;
    sellStatus?: ProductStoreSellStatus;
  }> = []
) {
  const skuPrices = skus
    .map((item) => item.price)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const skuStocks = skus
    .map((item) => item.stock)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const price = skuPrices.length ? Math.min(...skuPrices) : 0;
  const stock = skuStocks.length ? skuStocks.reduce((sum, value) => sum + value, 0) : 0;
  const status = skus.some(
    (item) =>
      (item.sellStatus === 'unsellable' ? 'unsellable' : 'sellable') === 'sellable' &&
      item.status === 'on'
  )
    ? 'on'
    : 'off';

  return {
    price,
    stock,
    status,
  };
}

export function buildProductListItem(
  product: ProductItem,
  organizationScope: OrganizationScope,
  visibleStoreIds: string[],
  options: {
    resolvedSourceStoreId?: string;
    sourceStoreName?: string;
    sourceRegionName?: string;
    salesStatusCounts?: {
      selling: number;
      off: number;
    };
  } = {}
): ProductListItem {
  const currentStoreId = getProductCurrentStoreId(organizationScope, visibleStoreIds);
  const override = getProductStoreOverride(product, currentStoreId);
  const currentStoreConfig = currentStoreId
    ? (product.storeConfigs || []).find((item) => item.storeId === currentStoreId)
    : undefined;
  const resolvedSourceStoreId = options.resolvedSourceStoreId || product.sourceStoreId;
  const isSelfBuilt =
    Boolean(currentStoreId) &&
    resolvedSourceStoreId === currentStoreId;
  const isShared = Boolean(currentStoreId) && !isSelfBuilt;
  const canManageIndependentPrice =
    isShared && canStoreUseIndependentPrice(product, currentStoreId);
  const priceMode =
    canManageIndependentPrice && override?.priceMode === 'independent'
      ? 'independent'
      : 'follow';
  const stockMode =
    isShared && override?.stockMode === 'independent'
      ? 'independent'
      : 'follow';
  const currentSkus = getProductCurrentSkus(product, currentStoreId);
  const nextStock = currentStoreId
    ? currentSkus.reduce((total, item) => total + item.currentStock, 0)
    : product.stock;

  return {
    ...product,
    stock: nextStock,
    storeView: {
      currentStoreId,
      currentStoreSellStatus: currentStoreConfig?.sellStatus,
      currentStoreChannelStatus:
        currentStoreConfig?.sellStatus === 'sellable' ? 'on' : 'off',
      resolvedSourceStoreId,
      sourceLabel:
        options.sourceStoreName ||
        getProductStoreSourceLabel(product, organizationScope, visibleStoreIds),
      sourceStoreName: options.sourceStoreName || '',
      sourceRegionName: options.sourceRegionName || '',
      showOwnershipTag: Boolean(currentStoreId),
      ownershipTag: currentStoreId ? (isSelfBuilt ? '自建' : '引用') : undefined,
      canManageStoreStatus:
        Boolean(currentStoreId) && currentStoreConfig?.sellStatus === 'sellable',
      canManageStoreSettings: Boolean(currentStoreId) && isShared,
      canManageIndependentPrice,
      isShared,
      isSelfBuilt,
      hasStoreSetting: hasProductStoreSetting(override),
      salesStatusCounts: options.salesStatusCounts || {
        selling: 0,
        off: 0,
      },
      priceMode,
      stockMode,
      nameMode: override?.nameMode || 'follow',
      carouselMode: override?.carouselMode || 'follow',
      originalName: product.name,
      currentName: getProductCurrentName(product, currentStoreId),
      originalPrice: product.price,
      currentPrice: getProductCurrentPrice(product, currentStoreId),
      originalSkus: (product.skus || []).map((item) => ({
        ...item,
      })),
      currentSkus,
      originalCarouselImages: normalizeProductCarouselImages(
        product.carouselImages || []
      ),
      currentCarouselImages: getProductCurrentCarouselImages(
        product,
        currentStoreId
      ),
    },
  };
}
