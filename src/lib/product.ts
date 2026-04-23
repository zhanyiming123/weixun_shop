import type {
  OrganizationScope,
  ProductCarouselImage,
  ProductFilterValues,
  ProductIndependentPriceRule,
  ProductItem,
  ProductListItem,
  ProductSkuIndependentPriceRule,
  ProductSourceType,
  ProductStatus,
  ProductStoreSkuPriceOverrideItem,
  ProductStoreSkuViewItem,
  ProductStoreOverrideItem,
  ProductStoreOverrideMap,
  ProductStoreConfigItem,
  ProductStoreOverrideMode,
  ProductStorePriceMode,
} from '@/types/product';
import type { OrganizationItem } from '@/pages/enterprise/organization/data';
import { getOrganizationRegionLabel } from '@/pages/enterprise/organization/data';
import type { ProductStoreItem } from '@/pages/product/store-config/data';

export const DEFAULT_INVENTORY_UNIT = '份';

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

export const DEFAULT_FILTER_VALUES: ProductFilterValues = {
  searchType: 'productName',
  keyword: '',
  productCatalogId: undefined,
  productOwnershipId: undefined,
  productSourceType: undefined,
  sourceStoreIds: [],
  minPrice: undefined,
  maxPrice: undefined,
  createdAtRange: [],
};

export function createDefaultFilterValues(): ProductFilterValues {
  return {
    ...DEFAULT_FILTER_VALUES,
    sourceStoreIds: [],
    createdAtRange: [],
  };
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
  return storeConfigs.some(
    (item) => item.sellStatus === 'sellable' && item.channelStatus === 'on'
  )
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
    currentPrice: undefined,
    skuPriceOverrides: [],
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

export function getProductSkuIndependentPriceRule(
  product: ProductItem,
  skuId: string
) {
  return getProductIndependentPriceRule(product).skuRules.find(
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

export function normalizeProductStoreOverride(
  storeId: string,
  override?: Partial<ProductStoreOverrideItem>
): ProductStoreOverrideItem {
  const priceMode: ProductStorePriceMode =
    override?.priceMode === 'independent' ? 'independent' : 'follow';
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
  const overrideName =
    typeof override?.overrideName === 'string' && override.overrideName.trim()
      ? override.overrideName.trim()
      : undefined;

  return {
    ...createDefaultProductStoreOverride(storeId),
    ...override,
    storeId,
    priceMode,
    currentPrice,
    skuPriceOverrides,
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
  storeOverrides?: ProductStoreOverrideMap
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
        override as ProductStoreOverrideItem
      );
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
  return override ? normalizeProductStoreOverride(storeId, override) : undefined;
}

export function hasProductStoreSetting(override?: ProductStoreOverrideItem) {
  if (!override) {
    return false;
  }

  return (
    override.priceMode === 'independent' ||
    override.nameMode === 'override' ||
    override.carouselMode === 'override'
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

export function getProductCurrentSkus(
  product: ProductItem,
  storeId?: string
): ProductStoreSkuViewItem[] {
  const override = getProductStoreOverride(product, storeId);
  const independentPriceRule = getProductIndependentPriceRule(product);

  return (product.skus || []).map((sku) => {
    const overridePrice = getProductSkuOverridePrice(override, sku.id);
    const skuPriceRule = getProductSkuIndependentPriceRule(product, sku.id);
    const currentPrice =
      independentPriceRule.enabled &&
      override?.priceMode === 'independent' &&
      typeof overridePrice === 'number' &&
      Number.isFinite(overridePrice)
        ? overridePrice
        : independentPriceRule.enabled &&
            override?.priceMode === 'independent' &&
            product.specMode !== 'multi' &&
            typeof override.currentPrice === 'number' &&
            Number.isFinite(override.currentPrice)
          ? override.currentPrice
          : sku.price;

    return {
      id: sku.id,
      specText: sku.specText,
      stock: sku.stock,
      status: sku.status,
      originalPrice: sku.price,
      currentPrice,
      minIndependentPrice: skuPriceRule?.minPrice,
      maxIndependentPrice: skuPriceRule?.maxPrice,
    };
  });
}

export function getProductCurrentPrice(product: ProductItem, storeId?: string) {
  const override = getProductStoreOverride(product, storeId);
  const independentPriceRule = getProductIndependentPriceRule(product);

  if (
    independentPriceRule.enabled &&
    override?.priceMode === 'independent' &&
    product.specMode === 'multi' &&
    Array.isArray(override.skuPriceOverrides) &&
    override.skuPriceOverrides.length
  ) {
    const currentSkuPrices = getProductCurrentSkus(product, storeId).map(
      (item) => item.currentPrice
    );

    if (currentSkuPrices.length) {
      return Math.min(...currentSkuPrices);
    }
  }

  if (
    independentPriceRule.enabled &&
    override?.priceMode === 'independent' &&
    typeof override.currentPrice === 'number' &&
    Number.isFinite(override.currentPrice)
  ) {
    return override.currentPrice;
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

  return product.sourceStoreId === currentStoreId ? '本店自建' : '门店共享';
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
  const independentPriceRule = getProductIndependentPriceRule(product);
  const canManageIndependentPrice = isShared && independentPriceRule.enabled;
  const priceMode =
    canManageIndependentPrice && override?.priceMode === 'independent'
      ? 'independent'
      : 'follow';

  return {
    ...product,
    storeView: {
      currentStoreId,
      currentStoreSellStatus: currentStoreConfig?.sellStatus,
      currentStoreChannelStatus: currentStoreConfig?.channelStatus,
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
      nameMode: override?.nameMode || 'follow',
      carouselMode: override?.carouselMode || 'follow',
      originalName: product.name,
      currentName: getProductCurrentName(product, currentStoreId),
      originalPrice: product.price,
      currentPrice: getProductCurrentPrice(product, currentStoreId),
      originalSkus: (product.skus || []).map((item) => ({
        ...item,
      })),
      currentSkus: getProductCurrentSkus(product, currentStoreId),
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
