export type ProductSearchType = 'productName' | 'productId';
export type ProductStatus = 'on' | 'off';
export type ProductType = 'virtual' | 'course' | 'service';
export type ProductSpecMode = 'single' | 'multi';
export type ProductSourceType = 'headquarter' | 'store';
export type ProductKind = 'standard' | 'combo' | 'bundle';
export type ProductTab = 'all' | 'selling' | 'warehouse';
export type OrganizationScope = 'headquarter' | 'region' | 'store';
export type ProductStoreOverrideMode = 'follow' | 'override';
export type ProductStorePriceMode = 'follow' | 'independent';
export type ProductStoreStockMode = 'follow' | 'independent';
export type ProductOwnershipTag = '自建' | '引用';
export type PublishProductTargetMode = 'all' | 'specific';
export type ProductShareStatus = 'pending' | 'referenced';

export type ProductStoreSellStatus = 'sellable' | 'unsellable';
export type ProductStoreChannelStatus = 'on' | 'off';
export type ProductSkuStateAction = 'sellable' | 'unsellable' | 'on' | 'off';

export type ProductCarouselImage = {
  id: string;
  name: string;
  url: string;
};

export type ProductStoreSkuPriceOverrideItem = {
  skuId: string;
  currentPrice: number;
};

export type ProductStoreSkuStockOverrideItem = {
  skuId: string;
  currentStock: number;
};

export type ProductStoreSkuStatusOverrideItem = {
  skuId: string;
  currentStatus: ProductStatus;
};

export type ProductStoreSkuSellStatusOverrideItem = {
  skuId: string;
  currentSellStatus: ProductStoreSellStatus;
};

export type ProductStoreLocalSkuItem = {
  skuId: string;
  specText: string;
  price: number;
  stock: number;
  sellStatus: ProductStoreSellStatus;
  status: ProductStatus;
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
};

export type ProductSkuIndependentPriceRule = {
  skuId: string;
  minPrice?: number;
  maxPrice?: number;
};

export type ProductIndependentPriceRule = {
  enabled: boolean;
  skuRules: ProductSkuIndependentPriceRule[];
};

export type ProductSkuIndependentStockRule = {
  skuId: string;
  minStock?: number;
  maxStock?: number;
};

export type ProductIndependentStockRule = {
  enabled: boolean;
  skuRules: ProductSkuIndependentStockRule[];
};

export type ProductStoreChannelCustomFieldKey =
  | 'productPrice'
  | 'productStock'
  | 'addSpecValue';

export type ProductStoreChannelStoreScope = 'allStores' | 'specificStores';
export type ProductStoreChannelSkuScope = 'allSkus' | 'specificSkus';
export type ProductStoreChannelShareMode = 'product_pool' | 'shared_pool';

export type ProductStoreChannelProductPoolStoreConfigItem = {
  storeId: string;
  sellStatus: ProductStoreSellStatus;
  channelStatus?: ProductStoreChannelStatus;
  sellableSkuIds?: string[];
  allowSelfPrice?: boolean;
};

export type ProductStoreChannelConfigItem = {
  shareMode: ProductStoreChannelShareMode;
  storeScope: ProductStoreChannelStoreScope;
  storeIds: string[];
  productPoolStoreConfigs?: ProductStoreChannelProductPoolStoreConfigItem[];
};

/**
 * @deprecated 仅用于兼容历史 `storeChannelRules` 数据读取。
 */
export type ProductStoreChannelRuleSkuConfigItem = {
  skuId: string;
  minSuggestedPrice?: number;
  maxSuggestedPrice?: number;
  minSuggestedStock?: number;
  maxSuggestedStock?: number;
};

/**
 * @deprecated 仅用于兼容历史 `storeChannelRules` 数据读取。
 */
export type ProductStoreChannelRuleItem = {
  id: string;
  fieldKeys: ProductStoreChannelCustomFieldKey[];
  storeScope: ProductStoreChannelStoreScope;
  storeIds: string[];
  skuScope: ProductStoreChannelSkuScope;
  skuIds: string[];
  shareMode: ProductStoreChannelShareMode;
  skuConfigs: ProductStoreChannelRuleSkuConfigItem[];
};

export type ProductStoreConfigItem = {
  storeId: string;
  sellStatus: ProductStoreSellStatus;
  channelStatus: ProductStoreChannelStatus;
};

export type ProductStoreOverrideItem = {
  storeId: string;
  priceMode: ProductStorePriceMode;
  stockMode: ProductStoreStockMode;
  currentPrice?: number;
  skuPriceOverrides?: ProductStoreSkuPriceOverrideItem[];
  skuStockOverrides?: ProductStoreSkuStockOverrideItem[];
  skuSellStatusOverrides?: ProductStoreSkuSellStatusOverrideItem[];
  skuStatusOverrides?: ProductStoreSkuStatusOverrideItem[];
  localSkuItems?: ProductStoreLocalSkuItem[];
  nameMode: ProductStoreOverrideMode;
  overrideName?: string;
  carouselMode: ProductStoreOverrideMode;
  overrideCarouselImages: ProductCarouselImage[];
  updatedAt?: string;
};

export type ProductStoreOverrideMap = Record<string, ProductStoreOverrideItem>;

export type ProductSkuItem = {
  id: string;
  specText: string;
  price: number;
  stock: number;
  sellStatus?: ProductStoreSellStatus;
  status: ProductStatus;
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
};

export type ProductStoreSkuViewItem = {
  id: string;
  specText: string;
  stock: number;
  sellStatus: ProductStoreSellStatus;
  status: ProductStatus;
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
  isLocalSku?: boolean;
  originalStock: number;
  currentStock: number;
  originalSellStatus: ProductStoreSellStatus;
  currentSellStatus: ProductStoreSellStatus;
  originalStatus: ProductStatus;
  currentStatus: ProductStatus;
  originalPrice: number;
  currentPrice: number;
  minIndependentPrice?: number;
  maxIndependentPrice?: number;
  minIndependentStock?: number;
  maxIndependentStock?: number;
};

export type ProductBundleComponentItem = {
  productId: string;
  skuId: string;
};

export type ProductPurchaseLimit = {
  enabled: boolean;
  count?: number;
};

export type ProductDetailContent = {
  html: string;
  fontSize?: string;
  lineHeight?: string;
};

export type ProductShareTargetItem = {
  storeId: string;
  status: ProductShareStatus;
  sharedAt: string;
  referencedAt?: string;
  sellableSkuIds?: string[];
  allowSelfPrice?: boolean;
};

export type ProductItem = {
  id: string;
  name: string;
  productKind: ProductKind;
  productCatalogId: string;
  productOwnershipId: string;
  productType: ProductType;
  inventoryUnit: string;
  isLimited?: boolean;
  limitCount?: number;
  detailHtml?: string;
  specMode: ProductSpecMode;
  skus: ProductSkuItem[];
  status: ProductStatus;
  price: number;
  stock: number;
  createdAt: string;
  sourceType: ProductSourceType;
  sourceStoreId?: string;
  storeConfigs: ProductStoreConfigItem[];
  bundleComponents?: ProductBundleComponentItem[];
  shareTargets?: ProductShareTargetItem[];
  carouselImages?: ProductCarouselImage[];
  purchaseLimit?: ProductPurchaseLimit;
  detailContent?: ProductDetailContent;
  storeOverrides?: ProductStoreOverrideMap;
  independentPriceRule?: ProductIndependentPriceRule;
  independentStockRule?: ProductIndependentStockRule;
  storeChannelConfig?: ProductStoreChannelConfigItem;
  /**
   * @deprecated 仅用于兼容历史 `storeChannelRules` 数据读取。
   */
  storeChannelRules?: ProductStoreChannelRuleItem[];
};

export type ProductStoreView = {
  currentStoreId?: string;
  currentStoreSellStatus?: ProductStoreSellStatus;
  currentStoreChannelStatus?: ProductStoreChannelStatus;
  resolvedSourceStoreId?: string;
  sourceLabel: string;
  sourceStoreName: string;
  sourceRegionName: string;
  showOwnershipTag: boolean;
  ownershipTag?: ProductOwnershipTag;
  canManageStoreStatus: boolean;
  canManageStoreSettings: boolean;
  canManageIndependentPrice: boolean;
  isShared: boolean;
  isSelfBuilt: boolean;
  hasStoreSetting: boolean;
  salesStatusCounts: {
    selling: number;
    off: number;
  };
  priceMode: ProductStorePriceMode;
  stockMode: ProductStoreStockMode;
  nameMode: ProductStoreOverrideMode;
  carouselMode: ProductStoreOverrideMode;
  originalName: string;
  currentName: string;
  originalPrice: number;
  currentPrice: number;
  originalSkus: ProductSkuItem[];
  currentSkus: ProductStoreSkuViewItem[];
  originalCarouselImages: ProductCarouselImage[];
  currentCarouselImages: ProductCarouselImage[];
};

export type ProductListItem = ProductItem & {
  storeView: ProductStoreView;
};

export type ProductFilterValues = {
  searchType: ProductSearchType;
  keyword: string;
  sellStatus?: ProductStoreSellStatus;
  productCatalogId?: string;
  productOwnershipId?: string;
  productSourceType?: ProductSourceType;
  sourceStoreIds: string[];
  minPrice?: number;
  maxPrice?: number;
  createdAtRange: string[];
};

export type ProductTabCounts = {
  all: number;
  selling: number;
  warehouse: number;
};

export type ProductListQuery = {
  productKind?: ProductKind;
  tab: ProductTab;
  filters: ProductFilterValues;
  organizationScope: OrganizationScope;
  visibleStoreIds: string[];
  demoIdentityId?: 'merchant_admin' | 'region_admin' | 'store_staff';
  page: number;
  pageSize: number;
  revision?: number;
};

export type ProductListResult = {
  items: ProductListItem[];
  total: number;
  tabCounts: ProductTabCounts;
};

export type UpdateProductStoreOverrideInput = {
  productId: string;
  storeId: string;
  priceMode: ProductStorePriceMode;
  stockMode: ProductStoreStockMode;
  currentPrice?: number;
  skuPriceOverrides?: ProductStoreSkuPriceOverrideItem[];
  skuStockOverrides?: ProductStoreSkuStockOverrideItem[];
  skuSellStatusOverrides?: ProductStoreSkuSellStatusOverrideItem[];
  skuStatusOverrides?: ProductStoreSkuStatusOverrideItem[];
  localSkuItems?: ProductStoreLocalSkuItem[];
  nameMode: ProductStoreOverrideMode;
  overrideName?: string;
  carouselMode: ProductStoreOverrideMode;
  overrideCarouselImages: ProductCarouselImage[];
};

export type PublishProductsToStoresInput = {
  productIds: string[];
  targetMode: PublishProductTargetMode;
  targetStoreIds: string[];
  sellStatus: ProductStoreSellStatus;
  channelStatus: ProductStoreChannelStatus;
  visibleStoreIds: string[];
};

export type UpdateProductStoreChannelStatusInput = {
  productIds: string[];
  storeId: string;
  channelStatus: ProductStoreChannelStatus;
};

export type UpdateProductStoreConfigsInput = {
  productId: string;
  storeConfigs: ProductStoreConfigItem[];
};

export type UpdateProductStoreChannelConfigInput = {
  productId: string;
  productPoolStoreConfigs: ProductStoreChannelProductPoolStoreConfigItem[];
};

export type UpdateProductSkuStatusesInput = {
  productId: string;
  storeId: string;
  skuIds: string[];
  action: ProductSkuStateAction;
};

export type ProductSharePoolQuery = {
  storeId: string;
  page: number;
  pageSize: number;
  status?: ProductShareStatus;
  keyword?: string;
  productKind?: ProductKind;
  filters?: ProductFilterValues;
};

export type ProductSharePoolItem = ProductListItem & {
  shareTarget: ProductShareTargetItem;
};

export type ProductSharePoolResult = {
  items: ProductSharePoolItem[];
  total: number;
};

export type ShareProductsToPoolInput = {
  productIds: string[];
  sourceStoreId: string;
  targetStoreIds: string[];
};

export type ReferenceSharedProductInput = {
  productId: string;
  storeId: string;
};

export type CancelReferenceSharedProductInput = {
  productId: string;
  storeId: string;
};
