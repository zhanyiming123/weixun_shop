import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Cascader,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Link,
  Message,
  Menu,
  Modal,
  Pagination,
  Select,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconEdit, IconPlus } from '@arco-design/web-react/icon';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './index.module.less';
import PublishStoreModal, {
  PublishStoreModalSubmitPayload,
} from './components/publish-store-modal';
import SalesStoreModal from './components/sales-store-modal';
import ShareTargetSelector from '@/pages/product/components/share-target-selector';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogFullLabel,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  readProductCatalogItems,
} from '../catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipFullLabel,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '../category/data';
import {
  createDefaultFilterValues,
  DEFAULT_INVENTORY_UNIT,
  getProductCurrentStoreId,
  getProductStoreOverride,
  resolveSourceStoreMetaById,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import {
  PRODUCT_STORE_SELL_STATUS_LABEL_MAP,
  ProductStoreSellStatus,
  readProductStoreItems,
} from '../store-config/data';
import {
  buildStoreSettingGeneratedLocalSkuCombos,
  buildStoreSettingLocalSkuSpecText,
  buildStoreSettingSpecDimensions,
  buildStoreSettingSpecFields,
  restoreStoreSettingLocalSkuState,
  syncStoreSettingLocalSkuRows,
  type StoreSettingLegacyLocalSkuIssue,
  type StoreSettingLocalSkuDraftRow,
  type StoreSettingLocalSpecValueMap,
  type StoreSettingSpecDimension,
  type StoreSettingSpecField,
} from './store-setting';
import { ProductService } from '@/services/ProductService';
import type {
  ProductCarouselImage,
  ProductFilterValues,
  ProductListItem,
  ProductSearchType,
  ProductStatus,
  ProductStoreChannelStatus,
  ProductStoreOverrideMode,
  ProductStorePriceMode,
  ProductStoreLocalSkuItem,
  ProductSkuStateAction,
  ProductStoreSkuPriceOverrideItem,
  ProductStoreSkuStatusOverrideItem,
  ProductStoreSkuStockOverrideItem,
  ProductStoreStockMode,
  ProductStoreSkuViewItem,
  ProductTab,
} from '@/types/product';
import { GlobalState } from '@/store';
import { filterStoreItemsByIds } from '@/utils/organization';

type ProductCreateActionMode = 'edit' | 'copy';
type ProductSourceFilterOption = {
  label: string;
  value: string;
  children?: ProductSourceFilterOption[];
};
type ProductRowActionItem = {
  key: string;
  label: string;
  onClick: () => void;
};

const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50];
const STORE_SETTING_SKU_PAGE_SIZE = 10;
const SELL_STATUS_FILTER_OPTIONS = [
  {
    label: '可售',
    value: 'sellable',
  },
  {
    label: '不可售',
    value: 'unsellable',
  },
];
const SKU_STATE_ACTION_LABEL_MAP: Record<ProductSkuStateAction, string> = {
  sellable: '设为可售',
  unsellable: '设为不可售',
  on: '上架',
  off: '下架',
};
const PRODUCT_STATUS_LABEL_MAP: Record<ProductStatus, string> = {
  on: '已上架',
  off: '已下架',
};

const Option = Select.Option;
const TabPane = Tabs.TabPane;
const RangePicker = DatePicker.RangePicker;

function getDateTimestamp(dateTime: string) {
  return new Date(dateTime.replace(' ', 'T')).getTime();
}

function normalizePath(value: (string | string[])[] | undefined): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
}

function normalizeMultiplePathValues(
  value: Array<string | string[]> | undefined
): string[][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string[] => Array.isArray(item));
}

function buildSourceFilterRegionValue(regionName: string) {
  return `region:${regionName}`;
}

function buildSourceFilterStoreValue(storeId: string) {
  return `store:${storeId}`;
}

function parseSourceFilterStoreIds(
  paths: string[][],
  regionStoreIdsMap: Map<string, string[]>
) {
  const nextStoreIdSet = new Set<string>();

  paths.forEach((path) => {
    if (!path.length) {
      return;
    }

    const lastValue = path[path.length - 1];

    if (lastValue.startsWith('store:')) {
      nextStoreIdSet.add(lastValue.replace(/^store:/, ''));
      return;
    }

    const regionValue = lastValue.startsWith('region:') ? lastValue : path[0];
    (regionStoreIdsMap.get(regionValue) || []).forEach((storeId) =>
      nextStoreIdSet.add(storeId)
    );
  });

  return Array.from(nextStoreIdSet);
}

function getStoreSettingSourceSkuViewItems(product: ProductListItem) {
  return product.storeView.currentSkus.filter((sku) => !sku.isLocalSku);
}

function getStoreSettingLocalSkuViewItems(product: ProductListItem) {
  return product.storeView.currentSkus.filter((sku) => sku.isLocalSku);
}

function createStoreSettingLocalSkuId(storeId: string, specText?: string) {
  const specKey = specText
    ? specText
        .replace(/\s+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')
        .slice(0, 24)
    : 'draft';

  return `store-local-sku-${storeId}-${specKey}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

type ProductStoreSettingDraft = {
  priceMode: ProductStorePriceMode;
  stockMode: ProductStoreStockMode;
  currentPrice?: number;
  skuPriceOverrides: ProductStoreSkuPriceOverrideItem[];
  skuStockOverrides: ProductStoreSkuStockOverrideItem[];
  skuStatusOverrides: ProductStoreSkuStatusOverrideItem[];
  nameMode: ProductStoreOverrideMode;
  overrideName: string;
  carouselMode: ProductStoreOverrideMode;
  overrideCarouselImages: ProductCarouselImage[];
  localSpecValuesByField: StoreSettingLocalSpecValueMap;
  localSpecValueInputs: Record<string, string>;
  localSkuRows: StoreSettingLocalSkuDraftRow[];
  legacyLocalSkuIssues: StoreSettingLegacyLocalSkuIssue[];
};

function getStoreSettingDraftSkuPriceOverrides(
  product: ProductListItem
): ProductStoreSkuPriceOverrideItem[] {
  return getStoreSettingSourceSkuViewItems(product).map((sku) => ({
    skuId: sku.id,
    currentPrice: sku.currentPrice,
  }));
}

function getStoreSettingDraftSkuStockOverrides(
  product: ProductListItem
): ProductStoreSkuStockOverrideItem[] {
  return getStoreSettingSourceSkuViewItems(product).map((sku) => ({
    skuId: sku.id,
    currentStock: sku.currentStock,
  }));
}

function getStoreSettingDraftSkuStatusOverrides(
  product: ProductListItem
): ProductStoreSkuStatusOverrideItem[] {
  const override = getProductStoreOverride(product, product.storeView.currentStoreId);
  return (override?.skuStatusOverrides || []).map((item) => ({
    ...item,
  }));
}

function getStoreSettingLocalSkuValidationMap(
  draft: ProductStoreSettingDraft | null
) {
  if (!draft) {
    return {};
  }

  return draft.localSkuRows.reduce<
    Record<string, Partial<Record<'price' | 'stock', string>>>
  >((result, item) => {
    const nextErrors: Partial<Record<'price' | 'stock', string>> = {};

    if (
      typeof item.price !== 'number' ||
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      nextErrors.price = '请填写本店售价';
    }

    if (
      typeof item.stock !== 'number' ||
      !Number.isFinite(item.stock) ||
      item.stock < 0 ||
      !Number.isInteger(item.stock)
    ) {
      nextErrors.stock = '请填写本店库存';
    }

    if (Object.keys(nextErrors).length) {
      result[item.specText] = nextErrors;
    }

    return result;
  }, {});
}

function getSkuLabel(item: ProductStoreSkuViewItem, index: number) {
  return item.specText || (index === 0 ? '默认规格' : `规格${index + 1}`);
}

function formatPriceRange(prices: number[]) {
  const validPrices = prices.filter(
    (price) => typeof price === 'number' && Number.isFinite(price)
  );

  if (!validPrices.length) {
    return '--';
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);

  return minPrice === maxPrice
    ? formatPriceNumber(minPrice)
    : `${formatPriceNumber(minPrice)}～${formatPriceNumber(maxPrice)}`;
}

function formatIndependentPriceLimit(sku: ProductStoreSkuViewItem) {
  const minPrice =
    typeof sku.minIndependentPrice === 'number' &&
    Number.isFinite(sku.minIndependentPrice)
      ? sku.minIndependentPrice
      : undefined;
  const maxPrice =
    typeof sku.maxIndependentPrice === 'number' &&
    Number.isFinite(sku.maxIndependentPrice)
      ? sku.maxIndependentPrice
      : undefined;

  if (typeof minPrice === 'number' && typeof maxPrice === 'number') {
    return `允许 ${formatPriceNumber(minPrice)}～${formatPriceNumber(maxPrice)}`;
  }

  if (typeof minPrice === 'number') {
    return `最低 ${formatPriceNumber(minPrice)}`;
  }

  if (typeof maxPrice === 'number') {
    return `最高 ${formatPriceNumber(maxPrice)}`;
  }

  return '不限';
}

function getSkuPriceLimitError(
  sku: ProductStoreSkuViewItem,
  value?: number
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '请填写独立售价';
  }

  if (
    typeof sku.minIndependentPrice === 'number' &&
    value < sku.minIndependentPrice
  ) {
    return `不能低于 ${formatPriceNumber(sku.minIndependentPrice)}`;
  }

  if (
    typeof sku.maxIndependentPrice === 'number' &&
    value > sku.maxIndependentPrice
  ) {
    return `不能高于 ${formatPriceNumber(sku.maxIndependentPrice)}`;
  }

  return '';
}

function resolveDraftSkuCurrentPrice(
  draft: ProductStoreSettingDraft,
  skuId: string,
  fallbackPrice: number
) {
  const matched = draft.skuPriceOverrides.find((item) => item.skuId === skuId);
  return typeof matched?.currentPrice === 'number' ? matched.currentPrice : fallbackPrice;
}

function resolveDraftSkuCurrentStock(
  draft: ProductStoreSettingDraft,
  skuId: string,
  fallbackStock: number
) {
  const matched = draft.skuStockOverrides.find((item) => item.skuId === skuId);
  return typeof matched?.currentStock === 'number' ? matched.currentStock : fallbackStock;
}

function buildDraftCurrentPriceValue(
  product: ProductListItem,
  draft: ProductStoreSettingDraft
) {
  const sourceSkuPrices = getStoreSettingSourceSkuViewItems(product).map((sku) =>
    resolveDraftSkuCurrentPrice(draft, sku.id, sku.currentPrice)
  );
  const localSkuPrices = draft.localSkuRows
    .map((sku) =>
      typeof sku.price === 'number' && Number.isFinite(sku.price) && sku.price >= 0
        ? sku.price
        : undefined
    )
    .filter((value): value is number => typeof value === 'number');
  const currentSkuPrices = [...sourceSkuPrices, ...localSkuPrices];

  return currentSkuPrices.length
    ? Math.min(...currentSkuPrices)
    : draft.currentPrice ?? product.storeView.currentPrice;
}

function getCurrentSkuPriceRange(record: ProductListItem) {
  return formatPriceRange(
    record.storeView.currentSkus.map((item) => item.currentPrice)
  );
}

function getOriginalSkuPriceRange(record: ProductListItem) {
  return formatPriceRange(
    record.storeView.originalSkus.map((item) => item.price)
  );
}

function cloneCarouselImages(images: ProductCarouselImage[] = []) {
  return images.map((item) => ({
    ...item,
  }));
}

function buildStoreSettingDraft(product: ProductListItem): ProductStoreSettingDraft {
  const sourceSkuItems = getStoreSettingSourceSkuViewItems(product);
  const specFields = buildStoreSettingSpecFields(sourceSkuItems);
  const restoredLocalSkuState = restoreStoreSettingLocalSkuState(
    sourceSkuItems,
    getStoreSettingLocalSkuViewItems(product).map((sku) => ({
      skuId: sku.id,
      specText: sku.specText,
      price: sku.currentPrice,
      stock: sku.currentStock,
      sellStatus: sku.currentSellStatus,
      status: sku.currentStatus,
    }))
  );

  return {
    priceMode: product.storeView.priceMode,
    stockMode: product.storeView.stockMode,
    currentPrice: product.storeView.currentPrice,
    skuPriceOverrides: getStoreSettingDraftSkuPriceOverrides(product),
    skuStockOverrides: getStoreSettingDraftSkuStockOverrides(product),
    skuStatusOverrides: getStoreSettingDraftSkuStatusOverrides(product),
    nameMode: product.storeView.nameMode,
    overrideName: product.storeView.currentName,
    carouselMode: product.storeView.carouselMode,
    overrideCarouselImages: cloneCarouselImages(
      product.storeView.currentCarouselImages
    ),
    localSpecValuesByField: restoredLocalSkuState.localSpecValuesByField,
    localSpecValueInputs: specFields.reduce<Record<string, string>>((result, field) => {
      result[field.key] = '';
      return result;
    }, {}),
    localSkuRows: restoredLocalSkuState.localSkuRows,
    legacyLocalSkuIssues: restoredLocalSkuState.legacyIssues,
  };
}

function getRecordDisplayStatus(record: ProductListItem): ProductStatus {
  if (record.storeView.currentStoreId) {
    return record.storeView.currentStoreChannelStatus === 'on' ? 'on' : 'off';
  }

  return record.status;
}

function getRecordSellStatus(record: ProductListItem): ProductStoreSellStatus {
  if (record.storeView.currentStoreSellStatus) {
    return record.storeView.currentStoreSellStatus;
  }

  return (record.storeConfigs || []).some((item) => item.sellStatus === 'sellable')
    ? 'sellable'
    : 'unsellable';
}

function ProductListPage() {
  const productService = useMemo(() => new ProductService(), []);
  const history = useHistory();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const currentDemoIdentity = useSelector(
    (state: GlobalState) => state.currentDemoIdentity
  );
  const isHeadquarter = currentOrganization?.scope === 'headquarter';
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const organizationItems = useMemo(
    () => readOrganizationItems().filter((item) => item.status === 'enabled'),
    []
  );
  const allStoreItems = useMemo(() => readProductStoreItems(), []);
  const allSourceStoreItems = useMemo(
    () => allStoreItems.filter((item) => item.type === 'store'),
    [allStoreItems]
  );
  const productCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const productOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const [formValues, setFormValues] = useState<ProductFilterValues>(
    createDefaultFilterValues()
  );
  const [appliedFilters, setAppliedFilters] = useState<ProductFilterValues>(
    createDefaultFilterValues()
  );
  const [sourceFilterPaths, setSourceFilterPaths] = useState<string[][]>([]);
  const [activeTab, setActiveTab] = useState<ProductTab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIST_PAGE_SIZE_OPTIONS[0]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>(
    []
  );
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [storeSettingTarget, setStoreSettingTarget] =
    useState<ProductListItem | null>(null);
  const [storeSettingDraft, setStoreSettingDraft] =
    useState<ProductStoreSettingDraft | null>(null);
  const [storeSettingSaving, setStoreSettingSaving] = useState(false);
  const [storeSettingSkuPage, setStoreSettingSkuPage] = useState(1);
  const [skuStatusTarget, setSkuStatusTarget] = useState<ProductListItem | null>(
    null
  );
  const [skuStatusSelectedRowKeys, setSkuStatusSelectedRowKeys] = useState<
    (string | number)[]
  >([]);
  const [skuStatusSubmitting, setSkuStatusSubmitting] =
    useState<ProductSkuStateAction | null>(null);
  const [shareTargetProduct, setShareTargetProduct] = useState<ProductListItem | null>(null);
  const [shareTargetStoreIds, setShareTargetStoreIds] = useState<string[]>([]);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [salesStoreTarget, setSalesStoreTarget] = useState<ProductListItem | null>(
    null
  );
  const visibleStoreIds = useMemo(
    () => currentOrganization?.storeIds || [],
    [currentOrganization?.storeIds]
  );
  const currentStoreId = useMemo(
    () =>
      getProductCurrentStoreId(
        currentOrganization?.scope || 'headquarter',
        visibleStoreIds
      ),
    [currentOrganization?.scope, visibleStoreIds]
  );
  const visibleStoreItems = useMemo(
    () =>
      isHeadquarter
        ? allStoreItems
        : filterStoreItemsByIds(allStoreItems, visibleStoreIds),
    [allStoreItems, isHeadquarter, visibleStoreIds]
  );
  const visibleSourceStoreItems = useMemo(
    () =>
      isHeadquarter
        ? allSourceStoreItems
        : filterStoreItemsByIds(allSourceStoreItems, visibleStoreIds),
    [allSourceStoreItems, isHeadquarter, visibleStoreIds]
  );
  const sourceFilterData = useMemo(() => {
    const regionStoreIdsMap = new Map<string, string[]>();
    const options = visibleSourceStoreItems.reduce<ProductSourceFilterOption[]>(
      (result, item) => {
        const sourceMeta = resolveSourceStoreMetaById(
          item.id,
          allSourceStoreItems,
          organizationItems
        );
        const regionLabel = sourceMeta.sourceRegionName || '未分组区域';
        const regionValue = buildSourceFilterRegionValue(regionLabel);
        const matchedRegion = result.find((option) => option.value === regionValue);
        const storeOption = {
          label: item.name,
          value: buildSourceFilterStoreValue(item.id),
        };

        regionStoreIdsMap.set(regionValue, [
          ...(regionStoreIdsMap.get(regionValue) || []),
          item.id,
        ]);

        if (matchedRegion) {
          matchedRegion.children = [...(matchedRegion.children || []), storeOption];
          return result;
        }

        return [
          ...result,
          {
            label: regionLabel,
            value: regionValue,
            children: [storeOption],
          },
        ];
      },
      []
    );

    return {
      options,
      regionStoreIdsMap,
    };
  }, [allSourceStoreItems, organizationItems, visibleSourceStoreItems]);
  const queryResult = useMemo(
    () =>
      productService.queryList({
        productKind: 'standard',
        tab: activeTab,
        filters: appliedFilters,
        organizationScope: currentOrganization?.scope || 'headquarter',
        visibleStoreIds,
        demoIdentityId: currentDemoIdentity,
        page: currentPage,
        pageSize,
        revision: refreshKey,
      }),
    [
      activeTab,
      appliedFilters,
      currentPage,
      currentDemoIdentity,
      currentOrganization?.scope,
      pageSize,
      productService,
      visibleStoreIds,
      refreshKey,
    ]
  );
  const tableData = queryResult.items;
  const tabCounts = queryResult.tabCounts;
  const storeSettingSourceSkuItems = useMemo(
    () =>
      storeSettingTarget ? getStoreSettingSourceSkuViewItems(storeSettingTarget) : [],
    [storeSettingTarget]
  );
  const storeSettingSpecFields = useMemo(
    () => buildStoreSettingSpecFields(storeSettingSourceSkuItems),
    [storeSettingSourceSkuItems]
  );
  const storeSettingSpecDimensions = useMemo<StoreSettingSpecDimension[]>(
    () =>
      buildStoreSettingSpecDimensions(
        storeSettingSourceSkuItems,
        storeSettingDraft?.localSpecValuesByField || {},
        storeSettingSpecFields
      ),
    [storeSettingDraft?.localSpecValuesByField, storeSettingSourceSkuItems, storeSettingSpecFields]
  );
  const storeSettingGeneratedLocalSkuCombos = useMemo(
    () =>
      buildStoreSettingGeneratedLocalSkuCombos(
        storeSettingSpecDimensions,
        storeSettingSourceSkuItems
      ),
    [storeSettingSourceSkuItems, storeSettingSpecDimensions]
  );
  const storeSettingLocalSkuValidationMap = useMemo(
    () => getStoreSettingLocalSkuValidationMap(storeSettingDraft),
    [storeSettingDraft]
  );
  const priceSettingErrorMap = useMemo(() => {
    if (
      !storeSettingTarget ||
      !storeSettingDraft ||
      !storeSettingTarget.storeView.canManageIndependentPrice
    ) {
      return {};
    }

    return storeSettingSourceSkuItems.reduce<Record<string, string>>(
      (result, sku) => {
        const error = getSkuPriceLimitError(
          sku,
          resolveDraftSkuCurrentPrice(
            storeSettingDraft,
            sku.id,
            sku.currentPrice
          )
        );

        if (error) {
          result[sku.id] = error;
        }

        return result;
      },
      {}
    );
  }, [storeSettingDraft, storeSettingSourceSkuItems, storeSettingTarget]);
  const hasPriceSettingError = Object.keys(priceSettingErrorMap).length > 0;
  const hasLocalSkuSettingError = Object.keys(
    storeSettingLocalSkuValidationMap
  ).length > 0 || Boolean(storeSettingDraft?.legacyLocalSkuIssues.length);
  const derivedStoreSettingPriceMode = useMemo<ProductStorePriceMode>(() => {
    if (
      !storeSettingTarget ||
      !storeSettingDraft ||
      !storeSettingTarget.storeView.canManageIndependentPrice
    ) {
      return 'follow';
    }

    const hasPriceChanges = storeSettingSourceSkuItems.some((sku) => {
      const currentPrice = resolveDraftSkuCurrentPrice(
        storeSettingDraft,
        sku.id,
        sku.currentPrice
      );

      return Number(currentPrice) !== Number(sku.originalPrice);
    });

    return hasPriceChanges ? 'independent' : 'follow';
  }, [storeSettingDraft, storeSettingSourceSkuItems, storeSettingTarget]);
  const derivedStoreSettingStockMode = useMemo<ProductStoreStockMode>(() => {
    if (!storeSettingDraft) {
      return 'follow';
    }

    const hasStockChanges = storeSettingSourceSkuItems.some((sku) => {
      const currentStock = resolveDraftSkuCurrentStock(
        storeSettingDraft,
        sku.id,
        sku.currentStock
      );

      return Number(currentStock) !== Number(sku.originalStock);
    });

    return hasStockChanges ? 'independent' : 'follow';
  }, [storeSettingDraft, storeSettingSourceSkuItems]);
  const storeSettingSourceSkuPageRows = useMemo(() => {
    const startIndex = (storeSettingSkuPage - 1) * STORE_SETTING_SKU_PAGE_SIZE;
    return storeSettingSourceSkuItems.slice(
      startIndex,
      startIndex + STORE_SETTING_SKU_PAGE_SIZE
    );
  }, [storeSettingSkuPage, storeSettingSourceSkuItems]);

  useEffect(() => {
    const visibleKeys = new Set(tableData.map((item) => item.id));
    setSelectedRowKeys((prev) =>
      prev.filter((key) => visibleKeys.has(String(key)))
    );
  }, [tableData]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(queryResult.total / pageSize));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, pageSize, queryResult.total]);

  useEffect(() => {
    if (!storeSettingTarget) {
      setStoreSettingDraft(null);
      return;
    }

    setStoreSettingSkuPage(1);
    setStoreSettingDraft(buildStoreSettingDraft(storeSettingTarget));
  }, [storeSettingTarget]);

  useEffect(() => {
    setSkuStatusSelectedRowKeys([]);
    setSkuStatusSubmitting(null);
  }, [skuStatusTarget]);

  function updateFormValue<K extends keyof ProductFilterValues>(
    field: K,
    value: ProductFilterValues[K]
  ) {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSearchTypeChange(value: string) {
    updateFormValue('searchType', value as ProductSearchType);
  }

  function handleRangeChange(dateString: string[]) {
    const nextRange =
      Array.isArray(dateString) && dateString[0] && dateString[1]
        ? [dateString[0], dateString[1]]
        : [];
    updateFormValue('createdAtRange', nextRange);
  }

  function handleQuery() {
    setAppliedFilters({
      ...formValues,
      sourceStoreIds: parseSourceFilterStoreIds(
        sourceFilterPaths,
        sourceFilterData.regionStoreIdsMap
      ),
      createdAtRange: [...formValues.createdAtRange],
    });
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }

  function handleReset() {
    const nextValues = createDefaultFilterValues();
    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setSourceFilterPaths([]);
    setActiveTab('all');
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }

  function goToProductCreate(
    mode: ProductCreateActionMode,
    record: ProductListItem
  ) {
    history.push({
      pathname: '/product/create',
      search: `?${qs.stringify({
        mode,
        sourceId: record.id,
      })}`,
      state: {
        mode,
        sourceProduct: record,
      },
    });
  }

  function showPendingMessage(text: string) {
    Message.info(text);
  }

  function openPublishModal() {
    if (!selectedRowKeys.length) {
      return;
    }

    setPublishModalVisible(true);
  }

  function closePublishModal() {
    setPublishModalVisible(false);
  }

  async function handlePublishSubmit(
    payload: PublishStoreModalSubmitPayload
  ) {
    const productIds = selectedRowKeys.map(String);

    try {
      const updatedCount = await productService.publishProductsToStores({
        ...payload,
        productIds,
        visibleStoreIds,
      });
      closePublishModal();
      setSelectedRowKeys([]);
      setRefreshKey((value) => value + 1);
      Message.success(`已成功发布${updatedCount}个商品`);
    } catch (error) {
      Message.error(getErrorMessage(error));
      throw error;
    }
  }

  function openSharePoolModal(record: ProductListItem) {
    if (!currentStoreId) {
      Message.warning('请先切换到具体店铺后再分享商品');
      return;
    }

    if (!record.storeView.isSelfBuilt) {
      Message.warning('仅支持本店自建商品分享');
      return;
    }

    setShareTargetProduct(record);
    setShareTargetStoreIds([]);
    setShareSubmitting(false);
  }

  function closeSharePoolModal() {
    setShareTargetProduct(null);
    setShareTargetStoreIds([]);
    setShareSubmitting(false);
  }

  function openSalesStoreModal(record: ProductListItem) {
    setSalesStoreTarget(record);
  }

  function closeSalesStoreModal() {
    setSalesStoreTarget(null);
  }

  async function handleSharePoolSubmit() {
    if (!currentStoreId || !shareTargetProduct) {
      return;
    }

    if (!shareTargetStoreIds.length) {
      Message.warning('请至少选择 1 家目标店铺');
      return;
    }

    try {
      setShareSubmitting(true);
      await productService.shareProductsToPool({
        productIds: [shareTargetProduct.id],
        sourceStoreId: currentStoreId,
        targetStoreIds: shareTargetStoreIds,
      });
      Message.success('已分享到目标店铺共享池');
      closeSharePoolModal();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setShareSubmitting(false);
      Message.error(getErrorMessage(error));
    }
  }

  async function updateProductStatus(ids: string[], nextStatus: ProductStatus) {
    if (currentStoreId) {
      await productService.updateProductStoreChannelStatus({
        productIds: ids,
        storeId: currentStoreId,
        channelStatus: nextStatus === 'on' ? 'on' : 'off',
      });
    } else {
      await productService.updateProductStatus(ids, nextStatus);
    }
    setRefreshKey((value) => value + 1);
  }

  async function handleRowSellStatusChange(
    nextSellStatus: ProductStoreSellStatus,
    record: ProductListItem
  ) {
    if (!currentStoreId) {
      return;
    }

    const nextChannelStatus: ProductStoreChannelStatus =
      nextSellStatus === 'sellable' && getRecordDisplayStatus(record) === 'on'
        ? 'on'
        : 'off';

    try {
      await productService.publishProductsToStores({
        productIds: [record.id],
        targetMode: 'specific',
        targetStoreIds: [currentStoreId],
        sellStatus: nextSellStatus,
        channelStatus: nextChannelStatus,
        visibleStoreIds,
      });
      setRefreshKey((value) => value + 1);
      Message.success(
        `${record.name}已设为${
          nextSellStatus === 'sellable' ? '可售' : '不可售'
        }`
      );
    } catch (error) {
      Message.error(getErrorMessage(error));
    }
  }

  async function handleRowStatusChange(
    nextStatus: ProductStatus,
    record: ProductListItem
  ) {
    if (currentStoreId && getRecordSellStatus(record) === 'unsellable') {
      Message.warning('请先将商品设为可售状态');
      return;
    }

    try {
      await updateProductStatus([record.id], nextStatus);
      Message.success(`${record.name}已${nextStatus === 'on' ? '上架' : '下架'}`);
    } catch (error) {
      Message.error(getErrorMessage(error));
    }
  }

  async function handleBatchStatusChange(nextStatus: ProductStatus) {
    if (!selectedRowKeys.length) {
      return;
    }

    try {
      const ids = selectedRowKeys.map(String);
      const tableDataMap = new Map(tableData.map((item) => [item.id, item]));
      const updatableIds = currentStoreId
        ? ids.filter((id) => tableDataMap.get(id)?.storeView.canManageStoreStatus)
        : ids;
      const skippedCount = ids.length - updatableIds.length;

      if (!updatableIds.length) {
        Message.warning('请先将商品设为可售状态');
        return;
      }

      await updateProductStatus(updatableIds, nextStatus);
      setSelectedRowKeys([]);
      Message.success(
        `已批量${nextStatus === 'on' ? '上架' : '下架'}${updatableIds.length}个商品${
          skippedCount ? `，跳过${skippedCount}个不可售商品` : ''
        }`
      );
    } catch (error) {
      Message.error(getErrorMessage(error));
    }
  }

  function closePriceSettingModal() {
    setStoreSettingTarget(null);
    setStoreSettingDraft(null);
    setStoreSettingSaving(false);
  }

  function openPriceSettingModal(product: ProductListItem) {
    if (!product.storeView.canManageStoreSettings) {
      Message.info('仅支持引用商品设置本店配置');
      return;
    }

    setStoreSettingTarget(product);
  }

  function handleSkuPriceChange(skuId: string, value?: number) {
    setStoreSettingDraft((previous) => {
      if (!previous || !storeSettingTarget) {
        return previous;
      }

      const nextSkuPriceOverrides = previous.skuPriceOverrides.map((item) =>
        item.skuId === skuId
          ? {
              ...item,
              currentPrice:
                typeof value === 'number' && Number.isFinite(value) ? value : item.currentPrice,
            }
          : item
      );

      const nextDraft = {
        ...previous,
        skuPriceOverrides: nextSkuPriceOverrides,
      };

      return {
        ...nextDraft,
        currentPrice: buildDraftCurrentPriceValue(storeSettingTarget, nextDraft),
      };
    });
  }

  function handleSkuStockChange(skuId: string, value?: number) {
    setStoreSettingDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        skuStockOverrides: previous.skuStockOverrides.map((item) =>
          item.skuId === skuId
            ? {
                ...item,
                currentStock:
                  typeof value === 'number' && Number.isFinite(value)
                    ? Math.max(0, Math.floor(value))
                    : item.currentStock,
              }
            : item
        ),
      };
    });
  }

  function syncDraftLocalSkuRows(
    previous: ProductStoreSettingDraft,
    nextLocalSpecValuesByField: StoreSettingLocalSpecValueMap
  ) {
    if (!storeSettingTarget) {
      return previous.localSkuRows;
    }

    const nextSpecDimensions = buildStoreSettingSpecDimensions(
      storeSettingSourceSkuItems,
      nextLocalSpecValuesByField,
      storeSettingSpecFields
    );
    const nextCombos = buildStoreSettingGeneratedLocalSkuCombos(
      nextSpecDimensions,
      storeSettingSourceSkuItems
    );

    return syncStoreSettingLocalSkuRows(
      nextCombos,
      previous.localSkuRows,
      (specText) =>
        createStoreSettingLocalSkuId(
          storeSettingTarget.storeView.currentStoreId || storeSettingTarget.id,
          specText
        )
    );
  }

  function handleLocalSpecValueInputChange(fieldKey: string, value: string) {
    setStoreSettingDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        localSpecValueInputs: {
          ...previous.localSpecValueInputs,
          [fieldKey]: value,
        },
      };
    });
  }

  function handleAddLocalSpecValue(fieldKey: string) {
    if (!storeSettingDraft || !storeSettingTarget) {
      return;
    }

    const currentDimension = storeSettingSpecDimensions.find(
      (item) => item.key === fieldKey
    );

    if (!currentDimension) {
      return;
    }

    const nextValue = (storeSettingDraft.localSpecValueInputs[fieldKey] || '').trim();

    if (!nextValue) {
      Message.warning(
        currentDimension.named ? `请输入${currentDimension.label}` : '请输入规格值'
      );
      return;
    }

    if (
      currentDimension.sourceValues.includes(nextValue) ||
      currentDimension.localValues.includes(nextValue)
    ) {
      Message.warning(
        currentDimension.named
          ? `${currentDimension.label}已存在该规格值`
          : '规格值不能重复'
      );
      return;
    }

    setStoreSettingDraft((previous) => {
      if (!previous) {
        return previous;
      }

      const nextLocalSpecValuesByField = {
        ...previous.localSpecValuesByField,
        [fieldKey]: [
          ...(previous.localSpecValuesByField[fieldKey] || []),
          nextValue,
        ],
      };
      const nextDraft = {
        ...previous,
        localSpecValuesByField: nextLocalSpecValuesByField,
        localSpecValueInputs: {
          ...previous.localSpecValueInputs,
          [fieldKey]: '',
        },
        localSkuRows: syncDraftLocalSkuRows(previous, nextLocalSpecValuesByField),
      };

      return {
        ...nextDraft,
        currentPrice: buildDraftCurrentPriceValue(storeSettingTarget, nextDraft),
      };
    });
  }

  function handleRemoveLocalSpecValue(fieldKey: string, value: string) {
    if (!storeSettingTarget) {
      return;
    }

    setStoreSettingDraft((previous) => {
      if (!previous) {
        return previous;
      }

      const nextLocalSpecValuesByField = {
        ...previous.localSpecValuesByField,
        [fieldKey]: (previous.localSpecValuesByField[fieldKey] || []).filter(
          (item) => item !== value
        ),
      };
      const nextDraft = {
        ...previous,
        localSpecValuesByField: nextLocalSpecValuesByField,
        localSkuRows: syncDraftLocalSkuRows(previous, nextLocalSpecValuesByField),
      };

      return {
        ...nextDraft,
        currentPrice: buildDraftCurrentPriceValue(storeSettingTarget, nextDraft),
      };
    });
  }

  function handleLocalSkuItemChange(
    specText: string,
    field: keyof Pick<StoreSettingLocalSkuDraftRow, 'price' | 'stock'>,
    value?: number
  ) {
    setStoreSettingDraft((previous) => {
      if (!previous || !storeSettingTarget) {
        return previous;
      }

      const nextLocalSkuRows = previous.localSkuRows.map((item) =>
        item.specText === specText
          ? {
              ...item,
              [field]:
                typeof value === 'number' && Number.isFinite(value)
                  ? field === 'stock'
                    ? Math.max(0, Math.floor(value))
                    : value
                  : undefined,
            }
          : item
      );
      const nextDraft = {
        ...previous,
        localSkuRows: nextLocalSkuRows,
      };

      return {
        ...nextDraft,
        currentPrice: buildDraftCurrentPriceValue(storeSettingTarget, nextDraft),
      };
    });
  }

  function handleRemoveLegacyLocalSkuIssue(skuId: string) {
    setStoreSettingDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        legacyLocalSkuIssues: previous.legacyLocalSkuIssues.filter(
          (item) => item.skuId !== skuId
        ),
      };
    });
  }

  async function handleStoreSettingSubmit() {
    if (!storeSettingTarget || !storeSettingDraft || !currentStoreId) {
      return;
    }

    if (!storeSettingTarget.storeView.canManageStoreSettings) {
      Message.warning('仅支持引用商品设置本店配置');
      return;
    }

    if (
      storeSettingTarget.storeView.canManageIndependentPrice &&
      hasPriceSettingError
    ) {
      Message.warning('请先调整超出允许区间的 SKU 售价');
      return;
    }

    if (storeSettingDraft.legacyLocalSkuIssues.length) {
      Message.warning('请先处理历史本店新增 SKU 异常项');
      return;
    }

    if (hasLocalSkuSettingError) {
      Message.warning('请先完善本店新增 SKU 配置');
      return;
    }

    try {
      setStoreSettingSaving(true);
      await productService.updateProductStoreOverride({
        productId: storeSettingTarget.id,
        storeId: currentStoreId,
        priceMode: derivedStoreSettingPriceMode,
        stockMode: derivedStoreSettingStockMode,
        currentPrice: storeSettingDraft.currentPrice,
        skuPriceOverrides: storeSettingDraft.skuPriceOverrides,
        skuStockOverrides: storeSettingDraft.skuStockOverrides,
        skuStatusOverrides: storeSettingDraft.skuStatusOverrides,
        localSkuItems: storeSettingDraft.localSkuRows.map((item) => ({
          skuId: item.skuId,
          specText: item.specText,
          price: typeof item.price === 'number' ? item.price : 0,
          stock: typeof item.stock === 'number' ? Math.floor(item.stock) : 0,
          sellStatus: item.sellStatus,
          status: item.status,
        })) as ProductStoreLocalSkuItem[],
        nameMode: storeSettingDraft.nameMode,
        overrideName: storeSettingDraft.overrideName,
        carouselMode: storeSettingDraft.carouselMode,
        overrideCarouselImages: storeSettingDraft.overrideCarouselImages,
      });
      Message.success('本店设置已保存');
      closePriceSettingModal();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setStoreSettingSaving(false);
      Message.error(getErrorMessage(error));
    }
  }

  function openSkuStatusModal(product: ProductListItem) {
    if (!currentStoreId) {
      return;
    }

    setSkuStatusTarget(product);
  }

  function closeSkuStatusModal() {
    setSkuStatusTarget(null);
    setSkuStatusSelectedRowKeys([]);
    setSkuStatusSubmitting(null);
  }

  async function handleSkuStatusBatchSubmit(action: ProductSkuStateAction) {
    if (!skuStatusTarget || !currentStoreId || !skuStatusSelectedRowKeys.length) {
      return;
    }

    try {
      setSkuStatusSubmitting(action);
      await productService.updateProductSkuStatuses({
        productId: skuStatusTarget.id,
        storeId: currentStoreId,
        skuIds: skuStatusSelectedRowKeys.map(String),
        action,
      });
      Message.success(`已${SKU_STATE_ACTION_LABEL_MAP[action]}${skuStatusSelectedRowKeys.length}个SKU`);
      closeSkuStatusModal();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setSkuStatusSubmitting(null);
      Message.error(getErrorMessage(error));
    }
  }

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 320,
      render: (_: string, record: ProductListItem) => (
        <div className={styles.nameCell}>
          <div className={styles.productTitleRow}>
            {record.storeView.showOwnershipTag && record.storeView.ownershipTag && (
              <Tag
                className={styles.ownershipTag}
                color={record.storeView.ownershipTag === '自建' ? 'green' : 'arcoblue'}
              >
                {record.storeView.ownershipTag}
              </Tag>
            )}
            <Typography.Text className={styles.productName}>
              {record.name}
            </Typography.Text>
          </div>
          <Typography.Text className={styles.productId}>
            id: {record.id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '商品类目',
      dataIndex: 'productCatalogId',
      width: 180,
      render: (value: string) => getProductCatalogFullLabel(value, catalogItems),
    },
    {
      title: '商品分类',
      dataIndex: 'productOwnershipId',
      width: 200,
      render: (value: string) => getProductOwnershipFullLabel(value, ownershipItems),
    },
    {
      title: '商品来源',
      dataIndex: 'sourceType',
      width: 180,
      render: (_: string, record: ProductListItem) => (
        <div className={styles.sourceStoreCell}>
          <Typography.Text className={styles.sourceStoreName}>
            {record.storeView.sourceStoreName || '--'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '可售状态',
      dataIndex: 'sellStatus',
      width: 116,
      render: (_: unknown, record: ProductListItem) =>
        currentStoreId ? (
          <Tag color={getRecordSellStatus(record) === 'sellable' ? 'green' : 'red'}>
            {PRODUCT_STORE_SELL_STATUS_LABEL_MAP[getRecordSellStatus(record)]}
          </Tag>
        ) : (
          <Typography.Text type="secondary">--</Typography.Text>
        ),
    },
    {
      title: '上架状态',
      dataIndex: 'status',
      width: 116,
      render: (_: ProductStatus, record: ProductListItem) => (
        <Tag color={getRecordDisplayStatus(record) === 'on' ? 'green' : 'gray'}>
          {PRODUCT_STATUS_LABEL_MAP[getRecordDisplayStatus(record)]}
        </Tag>
      ),
    },
    {
      title: '商品售价',
      dataIndex: 'price',
      width: 170,
      render: (_: number, record: ProductListItem) => (
        <div
          className={`${styles.priceQuickCell} ${
            record.storeView.canManageStoreSettings
              ? styles.priceQuickCellEditable
              : ''
          }`}
        >
          <div className={styles.priceQuickRow}>
            <span className={styles.pricePrimaryValue}>
              {getCurrentSkuPriceRange(record)}
            </span>
            {record.storeView.canManageStoreSettings && (
              <Tooltip content="本店设置">
                <Button
                  aria-label="本店设置"
                  className={styles.priceEditButton}
                  icon={<IconEdit />}
                  size="mini"
                  type="text"
                  onClick={() => openPriceSettingModal(record)}
                />
              </Tooltip>
            )}
          </div>
          {record.storeView.priceMode === 'independent' && (
            <Typography.Text className={styles.priceSourceValue}>
              源价 {getOriginalSkuPriceRange(record)}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 120,
      render: (value: number, record: ProductListItem) =>
        `${value} ${record.inventoryUnit || DEFAULT_INVENTORY_UNIT}`,
      sorter: (a: ProductListItem, b: ProductListItem) => a.stock - b.stock,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 168,
      sorter: (a: ProductListItem, b: ProductListItem) =>
        getDateTimestamp(a.createdAt) - getDateTimestamp(b.createdAt),
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 240,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductListItem) => {
        const currentSellStatus = getRecordSellStatus(record);
        const currentStatus = getRecordDisplayStatus(record);
        const rowActions: ProductRowActionItem[] = [
          {
            key: 'detail',
            label: '详情',
            onClick: () => showPendingMessage(`${record.name}详情暂未实现`),
          },
          ...(record.storeView.isShared
            ? [
                ...(record.storeView.canManageStoreSettings
                  ? [
                      {
                        key: 'store-setting',
                        label: '本店设置',
                        onClick: () => openPriceSettingModal(record),
                      },
                    ]
                  : []),
                {
                  key: 'copy',
                  label: '复制',
                  onClick: () => goToProductCreate('copy', record),
                },
              ]
            : [
                {
                  key: 'edit',
                  label: '编辑',
                  onClick: () => goToProductCreate('edit', record),
                },
                {
                  key: 'copy',
                  label: '复制',
                  onClick: () => goToProductCreate('copy', record),
                },
                ...(record.storeView.isSelfBuilt
                  ? [
                      {
                        key: 'sales-store',
                        label: '销售店铺',
                        onClick: () => openSalesStoreModal(record),
                      },
                    ]
                  : []),
              ]),
          ...(currentStoreId
            ? [
                {
                  key: 'sell-status',
                  label:
                    currentSellStatus === 'sellable' ? '设为不可售' : '设为可售',
                  onClick: () =>
                    handleRowSellStatusChange(
                      currentSellStatus === 'sellable' ? 'unsellable' : 'sellable',
                      record
                    ),
                },
              ]
            : []),
          {
            key: 'channel-status',
            label: currentStatus === 'on' ? '下架' : '上架',
            onClick: () =>
              handleRowStatusChange(currentStatus === 'on' ? 'off' : 'on', record),
          },
          ...(currentStoreId
            ? [
                {
                  key: 'sku-manage',
                  label: 'SKU管理',
                  onClick: () => openSkuStatusModal(record),
                },
              ]
            : []),
          ...(!record.storeView.isShared
            ? [
                {
                  key: 'stock',
                  label: '库存',
                  onClick: () =>
                    showPendingMessage(`${record.name}库存管理暂未实现`),
                },
              ]
            : []),
          {
            key: 'share',
            label: '分享',
            onClick: () => openSharePoolModal(record),
          },
        ];
        const primaryActions = rowActions.slice(0, 3);
        const overflowActions = rowActions.slice(3);
        const overflowActionMap = new Map(
          overflowActions.map((action) => [action.key, action])
        );

        return (
          <span className={styles.actionLinks}>
            {primaryActions.map((action) => (
              <Link
                key={action.key}
                className={styles.actionLinkButton}
                onClick={action.onClick}
              >
                {action.label}
              </Link>
            ))}
            {overflowActions.length > 0 && (
              <Dropdown
                droplist={
                  <Menu
                    selectable={false}
                    onClickMenuItem={(key) =>
                      overflowActionMap.get(String(key))?.onClick()
                    }
                  >
                    {overflowActions.map((action) => (
                      <Menu.Item key={action.key}>{action.label}</Menu.Item>
                    ))}
                  </Menu>
                }
                position="bl"
                trigger="click"
              >
                <Link
                  className={styles.actionLinkButton}
                >
                  更多
                </Link>
              </Dropdown>
            )}
          </span>
        );
      },
    },
  ];
  const storeSettingSkuColumns = [
    {
      title: 'SKU名称',
      dataIndex: 'specText',
      width: 220,
      render: (_: string, sku: ProductStoreSkuViewItem, index: number) => (
        <Typography.Text className={styles.storeSettingSkuName} ellipsis>
          {getSkuLabel(sku, index)}
        </Typography.Text>
      ),
    },
    {
      title: '源售价',
      dataIndex: 'originalPrice',
      width: 120,
      render: (value: number) => formatPriceNumber(value),
    },
    {
      title: '独立售价范围',
      dataIndex: 'independentPriceRange',
      width: 180,
      render: (_: unknown, sku: ProductStoreSkuViewItem) => (
        <Typography.Text className={styles.storeSettingRangeText}>
          {formatIndependentPriceLimit(sku)}
        </Typography.Text>
      ),
    },
    {
      title: '独立售价',
      dataIndex: 'currentPrice',
      width: 180,
      render: (_: number, sku: ProductStoreSkuViewItem) => {
        const canEditPrice = Boolean(
          storeSettingTarget?.storeView.canManageIndependentPrice
        );

        return (
          <div className={styles.storeSettingInputCell}>
            <InputNumber
              className={styles.storeSettingNumberInput}
              disabled={!canEditPrice}
              min={0}
              precision={2}
              value={
                storeSettingDraft
                  ? resolveDraftSkuCurrentPrice(
                      storeSettingDraft,
                      sku.id,
                      sku.currentPrice
                    )
                  : sku.currentPrice
              }
              onChange={(value) =>
                handleSkuPriceChange(
                  sku.id,
                  typeof value === 'number' ? value : undefined
                )
              }
            />
            {canEditPrice && priceSettingErrorMap[sku.id] && (
              <div className={styles.storeSettingInputError}>
                {priceSettingErrorMap[sku.id]}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '源库存',
      dataIndex: 'originalStock',
      width: 120,
    },
    {
      title: '独立库存',
      dataIndex: 'currentStock',
      width: 180,
      render: (_: number, sku: ProductStoreSkuViewItem) => {
        return (
          <InputNumber
            className={styles.storeSettingNumberInput}
            min={0}
            precision={0}
            value={
              storeSettingDraft
                ? resolveDraftSkuCurrentStock(
                    storeSettingDraft,
                    sku.id,
                    sku.currentStock
                  )
                : sku.currentStock
            }
            onChange={(value) =>
              handleSkuStockChange(
                sku.id,
                typeof value === 'number' ? value : undefined
              )
            }
          />
        );
      },
    },
  ];
  const storeSettingLocalSkuColumns = [
    ...storeSettingSpecDimensions.map((dimension, index) => ({
      title: dimension.label,
      dataIndex: dimension.key,
      width: 180,
      render: (_: unknown, sku: StoreSettingLocalSkuDraftRow) => (
        <Typography.Text className={styles.storeSettingSkuName} ellipsis>
          {sku.specValues[index] || '--'}
        </Typography.Text>
      ),
    })),
    {
      title: '本店售价',
      dataIndex: 'price',
      width: 180,
      render: (_: number, sku: StoreSettingLocalSkuDraftRow) => {
        const error = storeSettingLocalSkuValidationMap[sku.specText];

        return (
          <div className={styles.storeSettingLocalSkuField}>
            <InputNumber
              className={styles.storeSettingNumberInput}
              min={0}
              precision={2}
              placeholder="请输入售价"
              value={sku.price}
              onChange={(value) =>
                handleLocalSkuItemChange(
                  sku.specText,
                  'price',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
            {error?.price && (
              <div className={styles.storeSettingInputError}>{error.price}</div>
            )}
          </div>
        );
      },
    },
    {
      title: '本店库存',
      dataIndex: 'stock',
      width: 180,
      render: (_: number, sku: StoreSettingLocalSkuDraftRow) => {
        const error = storeSettingLocalSkuValidationMap[sku.specText];

        return (
          <div className={styles.storeSettingLocalSkuField}>
            <InputNumber
              className={styles.storeSettingNumberInput}
              min={0}
              precision={0}
              placeholder="请输入库存"
              value={sku.stock}
              onChange={(value) =>
                handleLocalSkuItemChange(
                  sku.specText,
                  'stock',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
            {error?.stock && (
              <div className={styles.storeSettingInputError}>{error.stock}</div>
            )}
          </div>
        );
      },
    },
  ];
  const skuStatusColumns = [
    {
      title: 'SKU',
      dataIndex: 'specText',
      render: (_: string, sku: ProductStoreSkuViewItem, index: number) => (
        <div className={styles.skuNameCell}>
          {sku.isLocalSku && (
            <Tag className={styles.skuNameTag} color="arcoblue">
              本店新增
            </Tag>
          )}
          <Typography.Text className={styles.storeSettingSkuName} ellipsis>
            {getSkuLabel(sku, index)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '库存',
      dataIndex: 'currentStock',
      width: 140,
    },
    {
      title: '可售状态',
      dataIndex: 'currentSellStatus',
      width: 120,
      render: (value: ProductStoreSellStatus) => (
        <Tag color={value === 'sellable' ? 'green' : 'red'}>
          {PRODUCT_STORE_SELL_STATUS_LABEL_MAP[value]}
        </Tag>
      ),
    },
    {
      title: '上下架状态',
      dataIndex: 'currentStatus',
      width: 140,
      render: (value: ProductStatus, sku: ProductStoreSkuViewItem) =>
        sku.currentSellStatus === 'unsellable' ? (
          <Tag color="gray">已下架</Tag>
        ) : (
          <Tag color={value === 'on' ? 'green' : 'arcoblue'}>
            {PRODUCT_STATUS_LABEL_MAP[value]}
          </Tag>
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <Form className={styles.filterForm}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>商品搜索</div>
              <Input.Group className={styles.searchGroup} compact>
                <Select
                  bordered
                  className={styles.searchTypeSelect}
                  value={formValues.searchType}
                  onChange={handleSearchTypeChange}
                >
                  <Option value="productName">商品名称</Option>
                  <Option value="productId">商品 ID</Option>
                </Select>
                <Input
                  allowClear
                  className={styles.keywordInput}
                  placeholder="请输入搜索内容"
                  value={formValues.keyword}
                  onChange={(value) => updateFormValue('keyword', value)}
                />
              </Input.Group>
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>可售状态</div>
              <Select
                allowClear
                className={styles.typeSelect}
                placeholder="全部"
                value={formValues.sellStatus}
                onChange={(value) =>
                  updateFormValue(
                    'sellStatus',
                    (value || undefined) as ProductFilterValues['sellStatus']
                  )
                }
              >
                {SELL_STATUS_FILTER_OPTIONS.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>商品类目</div>
              <Cascader
                allowClear
                className={styles.catalogCascader}
                options={productCatalogOptions}
                placeholder="请选择商品类目"
                value={
                  formValues.productCatalogId
                    ? getProductCatalogPathById(formValues.productCatalogId, catalogItems)
                    : undefined
                }
                onChange={(value) => {
                  const path = normalizePath(value);
                  updateFormValue(
                    'productCatalogId',
                    getProductCatalogIdFromPath(path, catalogItems)
                  );
                }}
              />
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>商品分类</div>
              <Cascader
                allowClear
                className={styles.catalogCascader}
                options={productOwnershipOptions}
                placeholder="请选择商品分类"
                value={
                  formValues.productOwnershipId
                    ? getProductOwnershipPathById(
                        formValues.productOwnershipId,
                        ownershipItems
                      )
                    : undefined
                }
                onChange={(value) => {
                  const path = normalizePath(value);
                  updateFormValue(
                    'productOwnershipId',
                    getProductOwnershipIdFromPath(path, ownershipItems)
                  );
                }}
              />
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>商品来源</div>
              <Cascader
                allowClear
                changeOnSelect
                className={styles.catalogCascader}
                mode="multiple"
                options={sourceFilterData.options}
                placeholder="请选择商品来源"
                value={sourceFilterPaths.length ? sourceFilterPaths : undefined}
                onChange={(value) =>
                  setSourceFilterPaths(normalizeMultiplePathValues(value))
                }
              />
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>价格区间</div>
              <div className={styles.priceGroup}>
                <InputNumber
                  className={styles.numberInput}
                  min={0}
                  placeholder="最低价格"
                  precision={2}
                  value={formValues.minPrice}
                  onChange={(value) => updateFormValue('minPrice', value)}
                />
                <span className={styles.rangeSeparator}>至</span>
                <InputNumber
                  className={styles.numberInput}
                  min={0}
                  placeholder="最高价格"
                  precision={2}
                  value={formValues.maxPrice}
                  onChange={(value) => updateFormValue('maxPrice', value)}
                />
              </div>
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>创建时间</div>
              <RangePicker
                className={styles.rangePicker}
                placeholder={['开始日期', '结束日期']}
                value={
                  formValues.createdAtRange.length
                    ? formValues.createdAtRange
                    : undefined
                }
                onChange={handleRangeChange}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <Button type="primary" onClick={handleQuery}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </Form>
      </Card>

      <Card className={styles.panelCard}>
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          destroyOnHide={false}
          onChange={(key) => {
            setActiveTab(key as ProductTab);
            setCurrentPage(1);
            setSelectedRowKeys([]);
          }}
        >
          <TabPane key="all" title={`全部(${tabCounts.all})`} />
          <TabPane key="selling" title={`销售中(${tabCounts.selling})`} />
          <TabPane key="warehouse" title={`仓库中(${tabCounts.warehouse})`} />
        </Tabs>

        <div className={styles.toolbar}>
          <Button type="primary" onClick={() => history.push('/product/create')}>
            添加商品
          </Button>
          <Button disabled={!selectedRowKeys.length} onClick={openPublishModal}>
            发布到店铺
          </Button>
          <Button
            disabled={!selectedRowKeys.length}
            onClick={() => handleBatchStatusChange('on')}
          >
            批量上架
          </Button>
          <Button
            disabled={!selectedRowKeys.length}
            onClick={() => handleBatchStatusChange('off')}
          >
            批量下架
          </Button>
        </div>

        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            columns={columns}
            data={tableData}
            noDataElement="暂无商品"
            pagination={false}
            rowSelection={{
              selectedRowKeys,
              columnWidth: 48,
              checkboxProps: (record) => ({
                disabled: Boolean(currentStoreId) && record.storeView.isShared,
              }),
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            scroll={{ x: 2300 }}
            tableLayoutFixed
          />
        </div>

        <div className={styles.paginationWrap}>
          <Pagination
            className={styles.pagination}
            current={currentPage}
            pageSize={pageSize}
            showJumper
            showTotal={(total) => `共 ${total} 条`}
            sizeCanChange
            sizeOptions={LIST_PAGE_SIZE_OPTIONS}
            total={queryResult.total}
            onChange={(pageNumber, nextPageSize) => {
              setCurrentPage(nextPageSize === pageSize ? pageNumber : 1);
              setPageSize(nextPageSize);
              setSelectedRowKeys([]);
            }}
          />
        </div>
      </Card>

      <PublishStoreModal
        visible={publishModalVisible}
        productCount={selectedRowKeys.length}
        storeItems={visibleStoreItems}
        organizationItems={organizationItems}
        onCancel={closePublishModal}
        onSubmit={handlePublishSubmit}
      />

      <SalesStoreModal
        visible={Boolean(salesStoreTarget)}
        product={salesStoreTarget}
        storeItems={visibleStoreItems}
        onCancel={closeSalesStoreModal}
      />

      <Modal
        title="分享到店铺共享池"
        visible={Boolean(shareTargetProduct)}
        autoFocus={false}
        focusLock
        style={{ width: 980 }}
        okText="确认分享"
        cancelText="取消"
        confirmLoading={shareSubmitting}
        onOk={handleSharePoolSubmit}
        onCancel={closeSharePoolModal}
      >
        {shareTargetProduct && (
          <div>
            <Typography.Paragraph>
              当前商品：{shareTargetProduct.name}
            </Typography.Paragraph>
            <ShareTargetSelector
              options={visibleSourceStoreItems.filter((item) => item.id !== currentStoreId)}
              value={shareTargetStoreIds}
              onChange={setShareTargetStoreIds}
            />
          </div>
        )}
      </Modal>

      <Modal
        className={styles.priceSettingModal}
        title="本店设置"
        visible={Boolean(storeSettingTarget)}
        style={{ width: 1080 }}
        okText="保存"
        cancelText="取消"
        confirmLoading={storeSettingSaving}
        okButtonProps={{
          disabled: hasPriceSettingError || hasLocalSkuSettingError,
        }}
        onCancel={closePriceSettingModal}
        onOk={handleStoreSettingSubmit}
      >
        {storeSettingTarget && storeSettingDraft && (
          <div className={styles.priceSettingBody}>
            <div className={styles.priceSettingSummary}>
              <Typography.Text className={styles.priceSettingProductName}>
                {storeSettingTarget.storeView.currentName}
              </Typography.Text>
              <Typography.Text className={styles.priceSettingSource}>
                来源：
                {storeSettingTarget.storeView.sourceStoreName ||
                  storeSettingTarget.storeView.sourceLabel ||
                  '--'}
                {storeSettingTarget.storeView.sourceRegionName
                  ? ` · ${storeSettingTarget.storeView.sourceRegionName}`
                  : ''}
              </Typography.Text>
            </div>

            <div className={styles.storeSettingSection}>
              <div className={styles.storeSettingSectionHeader}>
                <div>
                  <Typography.Text className={styles.storeSettingSectionTitle}>
                    源 SKU 配置
                  </Typography.Text>
                  <Typography.Paragraph className={styles.storeSettingSectionHint}>
                    源 SKU 保持只读，仅支持调整独立售价和独立库存。
                  </Typography.Paragraph>
                </div>
              </div>

              <div className={styles.storeSettingTableWrap}>
                <Table
                  rowKey="id"
                  columns={storeSettingSkuColumns}
                  data={storeSettingSourceSkuPageRows}
                  noDataElement="暂无源 SKU 数据"
                  pagination={{
                    current: storeSettingSkuPage,
                    pageSize: STORE_SETTING_SKU_PAGE_SIZE,
                    total: storeSettingSourceSkuItems.length,
                    simple: true,
                    sizeCanChange: false,
                    onChange: (pageNumber) => setStoreSettingSkuPage(pageNumber),
                  }}
                  scroll={{ x: 960 }}
                  tableLayoutFixed
                />
              </div>
            </div>

            {storeSettingTarget.specMode === 'multi' && (
              <div className={styles.storeSettingSection}>
                <div className={styles.storeSettingSectionHeader}>
                  <div>
                    <Typography.Text className={styles.storeSettingSectionTitle}>
                      本店新增 SKU
                    </Typography.Text>
                    <Typography.Paragraph className={styles.storeSettingSectionHint}>
                      先在规格项下新增规格值，再自动生成仅包含新增值的组合 SKU。
                    </Typography.Paragraph>
                  </div>
                </div>

                <div className={styles.storeSettingSpecPanel}>
                  {storeSettingSpecDimensions.map((dimension) => (
                    <div
                      key={dimension.key}
                      className={styles.storeSettingSpecDimensionCard}
                    >
                      <div className={styles.storeSettingSpecDimensionHeader}>
                        <Typography.Text className={styles.storeSettingSpecDimensionTitle}>
                          {dimension.label}
                        </Typography.Text>
                      </div>

                      <div className={styles.storeSettingSpecTagGroup}>
                        {dimension.sourceValues.map((value) => (
                          <Tag key={`${dimension.key}-source-${value}`}>{value}</Tag>
                        ))}
                        {dimension.localValues.map((value) => (
                          <Tag
                            key={`${dimension.key}-local-${value}`}
                            closable
                            color="arcoblue"
                            onClose={() =>
                              handleRemoveLocalSpecValue(dimension.key, value)
                            }
                          >
                            {value}
                          </Tag>
                        ))}
                      </div>

                      <div className={styles.storeSettingSpecInputRow}>
                        <Input
                          allowClear
                          className={styles.storeSettingSpecInput}
                          placeholder={
                            dimension.named
                              ? `请输入${dimension.label}`
                              : '请输入规格值，例如：红色'
                          }
                          value={
                            storeSettingDraft.localSpecValueInputs[dimension.key] || ''
                          }
                          onChange={(value) =>
                            handleLocalSpecValueInputChange(dimension.key, value)
                          }
                          onPressEnter={() => handleAddLocalSpecValue(dimension.key)}
                        />
                        <Button
                          icon={<IconPlus />}
                          type="text"
                          onClick={() => handleAddLocalSpecValue(dimension.key)}
                        >
                          添加规格值
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {Boolean(storeSettingDraft.legacyLocalSkuIssues.length) && (
                  <div className={styles.storeSettingLegacyIssuePanel}>
                    <Typography.Text className={styles.storeSettingLegacyIssueTitle}>
                      历史本店新增 SKU 需要处理
                    </Typography.Text>
                    <Typography.Paragraph className={styles.storeSettingLegacyIssueHint}>
                      以下旧数据无法按当前规格结构自动还原，删除后才能保存新的本店新增 SKU。
                    </Typography.Paragraph>
                    <div className={styles.storeSettingLegacyIssueList}>
                      {storeSettingDraft.legacyLocalSkuIssues.map((item) => (
                        <div
                          key={item.skuId}
                          className={styles.storeSettingLegacyIssueItem}
                        >
                          <div className={styles.storeSettingLegacyIssueContent}>
                            <Typography.Text className={styles.storeSettingLegacyIssueSpec}>
                              {item.specText || item.skuId}
                            </Typography.Text>
                            <Typography.Text
                              className={styles.storeSettingLegacyIssueReason}
                            >
                              {item.reason}
                            </Typography.Text>
                          </div>
                          <Button
                            size="mini"
                            type="text"
                            status="danger"
                            onClick={() => handleRemoveLegacyLocalSkuIssue(item.skuId)}
                          >
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {storeSettingDraft.localSkuRows.length > 0 && (
                  <div className={styles.storeSettingSection}>
                    <div className={styles.storeSettingSectionHeader}>
                      <div>
                        <Typography.Text className={styles.storeSettingSectionTitle}>
                          新增组合 SKU
                        </Typography.Text>
                        <Typography.Paragraph className={styles.storeSettingSectionHint}>
                          组合行由上方规格值自动生成，如需删除请回到上方移除对应规格值。
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className={styles.storeSettingTableWrap}>
                      <Table
                        rowKey="specText"
                        columns={storeSettingLocalSkuColumns}
                        data={storeSettingDraft.localSkuRows}
                        pagination={false}
                        scroll={{
                          x: Math.max(
                            960,
                            storeSettingSpecDimensions.length * 180 + 360
                          ),
                        }}
                        tableLayoutFixed
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="设置SKU状态"
        visible={Boolean(skuStatusTarget)}
        autoFocus={false}
        focusLock
        footer={
          <div className={styles.skuStatusModalFooter}>
            <Button
              disabled={!skuStatusSelectedRowKeys.length || Boolean(skuStatusSubmitting)}
              loading={skuStatusSubmitting === 'sellable'}
              type="primary"
              onClick={() => handleSkuStatusBatchSubmit('sellable')}
            >
              设为可售
            </Button>
            <Button
              disabled={!skuStatusSelectedRowKeys.length || Boolean(skuStatusSubmitting)}
              loading={skuStatusSubmitting === 'unsellable'}
              type="primary"
              onClick={() => handleSkuStatusBatchSubmit('unsellable')}
            >
              设为不可售
            </Button>
            <Button
              disabled={!skuStatusSelectedRowKeys.length || Boolean(skuStatusSubmitting)}
              loading={skuStatusSubmitting === 'on'}
              type="primary"
              onClick={() => handleSkuStatusBatchSubmit('on')}
            >
              上架
            </Button>
            <Button
              disabled={!skuStatusSelectedRowKeys.length || Boolean(skuStatusSubmitting)}
              loading={skuStatusSubmitting === 'off'}
              type="primary"
              onClick={() => handleSkuStatusBatchSubmit('off')}
            >
              下架
            </Button>
          </div>
        }
        style={{ width: 900 }}
        onCancel={closeSkuStatusModal}
      >
        {skuStatusTarget && (
          <div className={styles.skuStatusTableWrap}>
            <Table
              rowKey="id"
              columns={skuStatusColumns}
              data={skuStatusTarget.storeView.currentSkus}
              noDataElement="暂无 SKU 数据"
              pagination={false}
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: skuStatusSelectedRowKeys,
                columnWidth: 48,
                onChange: (keys) => setSkuStatusSelectedRowKeys(keys),
              }}
              scroll={{ x: 820 }}
              tableLayoutFixed
            />
          </div>
        )}
      </Modal>

    </div>
  );
}

export default ProductListPage;
