export type ProductSearchType = 'productName' | 'productId';
export type ProductStatus = 'on' | 'off';
export type ProductType = 'virtual' | 'course' | 'service';
export type ProductSpecMode = 'single' | 'multi';
export type ProductSourceType = 'headquarter' | 'store';
export type ProductTab = 'all' | 'selling' | 'warehouse';
export type OrganizationScope = 'headquarter' | 'region' | 'store';
export type ProductStoreOverrideMode = 'follow' | 'override';
export type ProductStorePriceMode = 'follow' | 'independent';
export type ProductOwnershipTag = '自建' | '引用';
export type PublishProductTargetMode = 'all' | 'specific';

export type ProductStoreSellStatus = 'sellable' | 'unsellable';
export type ProductStoreChannelStatus = 'on' | 'off';

export type ProductCarouselImage = {
  id: string;
  name: string;
  url: string;
};

export type ProductStoreSkuPriceOverrideItem = {
  skuId: string;
  currentPrice: number;
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

export type ProductStoreConfigItem = {
  storeId: string;
  sellStatus: ProductStoreSellStatus;
  channelStatus: ProductStoreChannelStatus;
};

export type ProductStoreOverrideItem = {
  storeId: string;
  priceMode: ProductStorePriceMode;
  currentPrice?: number;
  skuPriceOverrides?: ProductStoreSkuPriceOverrideItem[];
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
  status: ProductStatus;
};

export type ProductStoreSkuViewItem = {
  id: string;
  specText: string;
  stock: number;
  status: ProductStatus;
  originalPrice: number;
  currentPrice: number;
  minIndependentPrice?: number;
  maxIndependentPrice?: number;
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
  currentPrice?: number;
  skuPriceOverrides?: ProductStoreSkuPriceOverrideItem[];
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
