import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Cascader,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Link,
  Message,
  Modal,
  Pagination,
  Radio,
  Select,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconEdit } from '@arco-design/web-react/icon';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './index.module.less';
import PublishStoreModal, {
  PublishStoreModalSubmitPayload,
} from './components/publish-store-modal';
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
  filterProductStoreConfigsByStoreIds,
  getProductCurrentStoreId,
  getProductCurrentSkus,
  resolveSourceStoreMetaById,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import {
  buildProductStoreDetailItems,
  getProductStoreSummary,
  maskPhone,
  PRODUCT_STORE_TYPE_LABEL_MAP,
  ProductStoreDetailItem,
  ProductStoreSellStatus,
  readProductStoreItems,
} from '../store-config/data';
import { ProductService } from '@/services/ProductService';
import type {
  ProductCarouselImage,
  ProductFilterValues,
  ProductListItem,
  ProductSearchType,
  ProductStatus,
  ProductStoreOverrideMode,
  ProductStorePriceMode,
  ProductStoreSkuPriceOverrideItem,
  ProductStoreSkuViewItem,
  ProductTab,
} from '@/types/product';
import { GlobalState } from '@/store';
import { filterStoreItemsByIds } from '@/utils/organization';

type ProductCreateActionMode = 'edit' | 'copy';
type SalesStatusModalType = 'selling' | 'off';
type ProductSourceFilterOption = {
  label: string;
  value: string;
  children?: ProductSourceFilterOption[];
};

const STORE_DETAIL_PAGE_SIZE_OPTIONS = [20, 50];
const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50];

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

type ProductStoreSettingDraft = {
  priceMode: ProductStorePriceMode;
  currentPrice?: number;
  skuPriceOverrides: ProductStoreSkuPriceOverrideItem[];
  nameMode: ProductStoreOverrideMode;
  overrideName: string;
  carouselMode: ProductStoreOverrideMode;
  overrideCarouselImages: ProductCarouselImage[];
};

function getStoreSettingDraftSkuPriceOverrides(
  product: ProductListItem
): ProductStoreSkuPriceOverrideItem[] {
  return getProductCurrentSkus(product, product.storeView.currentStoreId).map((sku) => ({
    skuId: sku.id,
    currentPrice: sku.currentPrice,
  }));
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

function buildDraftCurrentPriceValue(
  product: ProductListItem,
  draft: ProductStoreSettingDraft
) {
  const currentSkuPrices = product.storeView.currentSkus.map((sku) =>
    resolveDraftSkuCurrentPrice(draft, sku.id, sku.currentPrice)
  );

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
    record.storeView.currentSkus.map((item) => item.originalPrice)
  );
}

function getDraftSkuPriceRange(
  product: ProductListItem,
  draft: ProductStoreSettingDraft
) {
  if (draft.priceMode !== 'independent') {
    return '跟随原售价';
  }

  return formatPriceRange(
    product.storeView.currentSkus.map((sku) =>
      resolveDraftSkuCurrentPrice(draft, sku.id, sku.currentPrice)
    )
  );
}

function cloneCarouselImages(images: ProductCarouselImage[] = []) {
  return images.map((item) => ({
    ...item,
  }));
}

function buildStoreSettingDraft(product: ProductListItem): ProductStoreSettingDraft {
  return {
    priceMode: product.storeView.priceMode,
    currentPrice: product.storeView.currentPrice,
    skuPriceOverrides: getStoreSettingDraftSkuPriceOverrides(product),
    nameMode: product.storeView.nameMode,
    overrideName: product.storeView.currentName,
    carouselMode: product.storeView.carouselMode,
    overrideCarouselImages: cloneCarouselImages(
      product.storeView.currentCarouselImages
    ),
  };
}

function getRecordDisplayStatus(record: ProductListItem): ProductStatus {
  if (record.storeView.currentStoreId) {
    return record.storeView.currentStoreChannelStatus === 'on' ? 'on' : 'off';
  }

  return record.status;
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
  const [salesStatusModalTarget, setSalesStatusModalTarget] = useState<{
    product: ProductListItem;
    status: SalesStatusModalType;
  } | null>(null);
  const [storeDetailTarget, setStoreDetailTarget] = useState<{
    product: ProductListItem;
    sellStatus: ProductStoreSellStatus;
  } | null>(null);
  const [storeDetailPage, setStoreDetailPage] = useState(1);
  const [storeDetailPageSize, setStoreDetailPageSize] = useState(20);
  const [storeSettingTarget, setStoreSettingTarget] =
    useState<ProductListItem | null>(null);
  const [storeSettingDraft, setStoreSettingDraft] =
    useState<ProductStoreSettingDraft | null>(null);
  const [storeSettingSaving, setStoreSettingSaving] = useState(false);
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
  const storeDetailItems = useMemo<ProductStoreDetailItem[]>(() => {
    if (!storeDetailTarget) {
      return [];
    }

    const scopedStoreConfigs = isHeadquarter
      ? storeDetailTarget.product.storeConfigs
      : filterProductStoreConfigsByStoreIds(
          storeDetailTarget.product.storeConfigs,
          visibleStoreIds
        );

    return buildProductStoreDetailItems(
      scopedStoreConfigs,
      visibleStoreItems
    ).filter((item) => item.sellStatus === storeDetailTarget.sellStatus);
  }, [isHeadquarter, storeDetailTarget, visibleStoreIds, visibleStoreItems]);
  const storeDetailTableData = useMemo(
    () => storeDetailItems.filter((item) => item.type === 'store'),
    [storeDetailItems]
  );
  const priceSettingErrorMap = useMemo(() => {
    if (
      !storeSettingTarget ||
      !storeSettingDraft ||
      storeSettingDraft.priceMode !== 'independent'
    ) {
      return {};
    }

    return storeSettingTarget.storeView.currentSkus.reduce<Record<string, string>>(
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
  }, [storeSettingDraft, storeSettingTarget]);
  const hasPriceSettingError = Object.keys(priceSettingErrorMap).length > 0;

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
    setStoreDetailPage(1);
  }, [storeDetailTarget]);

  useEffect(() => {
    if (!storeSettingTarget) {
      setStoreSettingDraft(null);
      return;
    }

    setStoreSettingDraft(buildStoreSettingDraft(storeSettingTarget));
  }, [storeSettingTarget]);

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

  function openSalesStatusModal(
    product: ProductListItem,
    status: SalesStatusModalType
  ) {
    setSalesStatusModalTarget({
      product,
      status,
    });
  }

  function closeSalesStatusModal() {
    setSalesStatusModalTarget(null);
  }

  function openStoreDetailModal(
    product: ProductListItem,
    sellStatus: ProductStoreSellStatus
  ) {
    setStoreDetailTarget({
      product,
      sellStatus,
    });
    setStoreDetailPage(1);
    setStoreDetailPageSize(20);
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

  async function handleRowStatusChange(
    checked: boolean,
    record: ProductListItem
  ) {
    try {
      await updateProductStatus([record.id], checked ? 'on' : 'off');
      Message.success(`${record.name}已${checked ? '上架' : '下架'}`);
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
      await updateProductStatus(ids, nextStatus);
      setSelectedRowKeys([]);
      Message.success(
        `已批量${nextStatus === 'on' ? '上架' : '下架'}${ids.length}个商品`
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
    if (!product.storeView.canManageIndependentPrice) {
      Message.info('源商品未开放独立售价');
      return;
    }

    setStoreSettingTarget(product);
  }

  function handlePriceModeChange(value: string) {
    setStoreSettingDraft((previous) => {
      if (!previous || !storeSettingTarget) {
        return previous;
      }

      const nextPriceMode = value as ProductStorePriceMode;
      const nextSkuPriceOverrides =
        previous.skuPriceOverrides.length
          ? previous.skuPriceOverrides
          : getStoreSettingDraftSkuPriceOverrides(storeSettingTarget);

      return {
        ...previous,
        priceMode: nextPriceMode,
        currentPrice:
          nextPriceMode === 'independent'
            ? previous.currentPrice ?? storeSettingTarget.storeView.currentPrice
            : previous.currentPrice,
        skuPriceOverrides: nextSkuPriceOverrides,
      };
    });
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

  async function handleStoreSettingSubmit() {
    if (!storeSettingTarget || !storeSettingDraft || !currentStoreId) {
      return;
    }

    if (!storeSettingTarget.storeView.canManageIndependentPrice) {
      Message.warning('源商品未开放独立售价');
      return;
    }

    if (
      storeSettingDraft.priceMode === 'independent' &&
      hasPriceSettingError
    ) {
      Message.warning('请先调整超出允许区间的 SKU 售价');
      return;
    }

    try {
      setStoreSettingSaving(true);
      await productService.updateProductStoreOverride({
        productId: storeSettingTarget.id,
        storeId: currentStoreId,
        priceMode: storeSettingDraft.priceMode,
        currentPrice: storeSettingDraft.currentPrice,
        skuPriceOverrides: storeSettingDraft.skuPriceOverrides,
        nameMode: storeSettingDraft.nameMode,
        overrideName: storeSettingDraft.overrideName,
        carouselMode: storeSettingDraft.carouselMode,
        overrideCarouselImages: storeSettingDraft.overrideCarouselImages,
      });
      Message.success('独立售价已保存');
      closePriceSettingModal();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setStoreSettingSaving(false);
      Message.error(getErrorMessage(error));
    }
  }

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 380,
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
      width: 220,
      render: (value: string) => getProductCatalogFullLabel(value, catalogItems),
    },
    {
      title: '商品分类',
      dataIndex: 'productOwnershipId',
      width: 260,
      render: (value: string) => getProductOwnershipFullLabel(value, ownershipItems),
    },
    {
      title: '商品来源',
      dataIndex: 'sourceType',
      width: 220,
      render: (_: string, record: ProductListItem) => (
        <div className={styles.sourceStoreCell}>
          <Typography.Text className={styles.sourceStoreName}>
            {record.storeView.sourceStoreName || '--'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '上架状态',
      dataIndex: 'status',
      width: 170,
      render: (_: ProductStatus, record: ProductListItem) => (
        <Switch
          className={styles.statusSwitch}
          checked={getRecordDisplayStatus(record) === 'on'}
          checkedText="上架"
          uncheckedText="下架"
          disabled={Boolean(currentStoreId) && !record.storeView.canManageStoreStatus}
          onChange={(checked) => handleRowStatusChange(checked, record)}
        />
      ),
    },
    {
      title: '销售状态',
      dataIndex: 'salesStatus',
      width: 180,
      render: (_: unknown, record: ProductListItem) => (
        <div className={styles.salesStatusCell}>
          <div className={styles.salesStatusRow}>
            <span className={styles.salesStatusLabel}>销售中：</span>
            <Link
              className={styles.salesStatusLink}
              onClick={() => openSalesStatusModal(record, 'selling')}
            >
              {record.storeView.salesStatusCounts.selling}
            </Link>
          </div>
          <div className={styles.salesStatusRow}>
            <span className={styles.salesStatusLabel}>已下架：</span>
            <Link
              className={styles.salesStatusLink}
              onClick={() => openSalesStatusModal(record, 'off')}
            >
              {record.storeView.salesStatusCounts.off}
            </Link>
          </div>
        </div>
      ),
    },
    {
      title: '商品售价',
      dataIndex: 'price',
      width: 220,
      render: (_: number, record: ProductListItem) => (
        <div
          className={`${styles.priceQuickCell} ${
            record.storeView.canManageIndependentPrice
              ? styles.priceQuickCellEditable
              : ''
          }`}
        >
          <div className={styles.priceQuickRow}>
            <span className={styles.pricePrimaryValue}>
              {getCurrentSkuPriceRange(record)}
            </span>
            {record.storeView.canManageIndependentPrice && (
              <Tooltip content="编辑独立售价">
                <Button
                  aria-label="编辑独立售价"
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
      width: 140,
      render: (value: number, record: ProductListItem) =>
        `${value} ${record.inventoryUnit || DEFAULT_INVENTORY_UNIT}`,
      sorter: (a: ProductListItem, b: ProductListItem) => a.stock - b.stock,
    },
    {
      title: '销售店铺',
      dataIndex: 'storeConfigs',
      width: 220,
      render: (
        value: ProductListItem['storeConfigs'],
        record: ProductListItem
      ) => {
        const scopedStoreConfigs = isHeadquarter
          ? value || []
          : filterProductStoreConfigsByStoreIds(value || [], visibleStoreIds);
        const summary = getProductStoreSummary(scopedStoreConfigs);

        return (
          <div className={styles.salesStoreCell}>
            <span className={styles.salesStoreMetric}>
              <Typography.Text className={styles.salesStoreLabel}>
                可售
              </Typography.Text>
              <Link
                className={styles.salesStoreLink}
                onClick={() => openStoreDetailModal(record, 'sellable')}
              >
                {summary.sellable}
              </Link>
            </span>
            <span className={styles.salesStoreMetric}>
              <Typography.Text className={styles.salesStoreLabel}>
                不可售
              </Typography.Text>
              <Link
                className={styles.salesStoreLink}
                onClick={() => openStoreDetailModal(record, 'unsellable')}
              >
                {summary.unsellable}
              </Link>
            </span>
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 200,
      sorter: (a: ProductListItem, b: ProductListItem) =>
        getDateTimestamp(a.createdAt) - getDateTimestamp(b.createdAt),
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductListItem) => (
        <span className={styles.actionLinks}>
          <Link
            className={styles.actionLinkButton}
            onClick={() => showPendingMessage(`${record.name}详情暂未实现`)}
          >
            详情
          </Link>
          {record.storeView.isShared ? (
            <>
              {record.storeView.canManageIndependentPrice && (
                <Link
                  className={styles.actionLinkButton}
                  onClick={() => openPriceSettingModal(record)}
                >
                  编辑价格
                </Link>
              )}
              <Link
                className={styles.actionLinkButton}
                onClick={() => goToProductCreate('copy', record)}
              >
                复制
              </Link>
            </>
          ) : (
            <>
              <Link
                className={styles.actionLinkButton}
                onClick={() => goToProductCreate('edit', record)}
              >
                编辑
              </Link>
              <Link
                className={styles.actionLinkButton}
                onClick={() => goToProductCreate('copy', record)}
              >
                复制
              </Link>
            </>
          )}
          {!record.storeView.isShared && (
            <Link
              className={styles.actionLinkButton}
              onClick={() => showPendingMessage(`${record.name}库存管理暂未实现`)}
            >
              库存
            </Link>
          )}
          <Link
            className={styles.actionLinkButton}
            onClick={() => showPendingMessage(`${record.name}分享功能暂未实现`)}
          >
            分享
          </Link>
        </span>
      ),
    },
  ];
  const storeDetailColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 220,
      render: (value: string) => (
        <Typography.Text className={styles.storeDetailName}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '店铺分类',
      dataIndex: 'type',
      width: 140,
      render: (value: ProductStoreDetailItem['type']) => (
        <Tag color={value === 'store' ? 'arcoblue' : 'orangered'}>
          {PRODUCT_STORE_TYPE_LABEL_MAP[value]}
        </Tag>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      width: 320,
    },
    {
      title: '店长/联系方式',
      dataIndex: 'managerName',
      width: 220,
      render: (_: string, record: ProductStoreDetailItem) => (
        <div className={styles.storeDetailContact}>
          <span>{record.managerName}</span>
          <span>{maskPhone(record.phone)}</span>
        </div>
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
            scroll={{ x: 2500 }}
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

      <Modal
        title={
          salesStatusModalTarget
            ? `${salesStatusModalTarget.status === 'selling' ? '销售中' : '已下架'}店铺`
            : '销售状态'
        }
        visible={Boolean(salesStatusModalTarget)}
        footer={null}
        onCancel={closeSalesStatusModal}
      >
        <div className={styles.emptyModalContent}>弹窗内容待补充</div>
      </Modal>

      <Modal
        className={styles.priceSettingModal}
        title="编辑独立售价"
        visible={Boolean(storeSettingTarget)}
        style={{ width: 720 }}
        okText="保存"
        cancelText="取消"
        confirmLoading={storeSettingSaving}
        okButtonProps={{
          disabled: hasPriceSettingError,
        }}
        onCancel={closePriceSettingModal}
        onOk={handleStoreSettingSubmit}
      >
        {storeSettingTarget && storeSettingDraft && (
          <div className={styles.priceSettingBody}>
            <div className={styles.priceSettingSummary}>
              <div className={styles.priceSettingProduct}>
                <Typography.Text className={styles.priceSettingProductName}>
                  {storeSettingTarget.name}
                </Typography.Text>
                <Typography.Text className={styles.priceSettingSource}>
                  来源：{storeSettingTarget.storeView.sourceStoreName || '--'}
                </Typography.Text>
              </div>
              <div className={styles.priceSettingMetrics}>
                <div className={styles.priceSettingMetric}>
                  <span className={styles.priceSettingMetricLabel}>源价</span>
                  <span className={styles.priceSettingMetricValue}>
                    {getOriginalSkuPriceRange(storeSettingTarget)}
                  </span>
                </div>
                <div className={styles.priceSettingMetric}>
                  <span className={styles.priceSettingMetricLabel}>
                    独立售价
                  </span>
                  <span className={styles.priceSettingMetricValue}>
                    {getDraftSkuPriceRange(storeSettingTarget, storeSettingDraft)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.priceModeBar}>
              <Radio.Group
                value={storeSettingDraft.priceMode}
                onChange={handlePriceModeChange}
              >
                <Radio value="follow">跟随原售价</Radio>
                <Radio value="independent">独立售价</Radio>
              </Radio.Group>
              {storeSettingDraft.priceMode === 'independent' && (
                <Link onClick={() => handlePriceModeChange('follow')}>
                  恢复跟随原售价
                </Link>
              )}
            </div>

            <div className={styles.quickSkuPricePanel}>
              <div className={styles.quickSkuPriceHeader}>
                <span>SKU 名称</span>
                <span>原售价</span>
                <span>独立售价</span>
              </div>
              {storeSettingTarget.storeView.currentSkus.map((sku, index) => {
                const isIndependent =
                  storeSettingDraft.priceMode === 'independent';

                return (
                  <div key={sku.id} className={styles.quickSkuPriceRow}>
                    <div className={styles.quickSkuPriceCell}>
                      <Typography.Text
                        className={styles.quickSkuPriceSpec}
                        ellipsis
                      >
                        {getSkuLabel(sku, index)}
                      </Typography.Text>
                    </div>
                    <div className={styles.quickSkuPriceCell}>
                      <span className={styles.quickSkuPriceText}>
                        {formatPriceNumber(sku.originalPrice)}
                      </span>
                    </div>
                    <div className={styles.quickSkuPriceCell}>
                      <InputNumber
                        className={styles.quickSkuPriceInput}
                        disabled={!isIndependent}
                        min={0}
                        precision={2}
                        value={
                          isIndependent
                            ? resolveDraftSkuCurrentPrice(
                                storeSettingDraft,
                                sku.id,
                                sku.currentPrice
                              )
                            : sku.originalPrice
                        }
                        onChange={(value) =>
                          handleSkuPriceChange(
                            sku.id,
                            typeof value === 'number' ? value : undefined
                          )
                        }
                      />
                      <div className={styles.quickSkuPriceLimit}>
                        {formatIndependentPriceLimit(sku)}
                      </div>
                      {isIndependent && priceSettingErrorMap[sku.id] && (
                        <div className={styles.quickSkuPriceError}>
                          {priceSettingErrorMap[sku.id]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={
          storeDetailTarget?.sellStatus === 'unsellable' ? '不可售店铺' : '可售店铺'
        }
        visible={Boolean(storeDetailTarget)}
        autoFocus={false}
        focusLock
        footer={null}
        style={{ width: 980 }}
        onCancel={() => setStoreDetailTarget(null)}
      >
        <div className={styles.storeDetailModal}>
          <Table
            rowKey="storeId"
            columns={storeDetailColumns}
            data={storeDetailTableData}
            noDataElement="暂无门店数据"
            pagination={{
              current: storeDetailPage,
              pageSize: storeDetailPageSize,
              total: storeDetailTableData.length,
              sizeCanChange: true,
              sizeOptions: STORE_DETAIL_PAGE_SIZE_OPTIONS,
              showTotal: true,
              showJumper: true,
              onChange: (pageNumber, pageSize) => {
                setStoreDetailPage(pageNumber);
                setStoreDetailPageSize(pageSize);
              },
            }}
            scroll={{ x: 860 }}
            tableLayoutFixed
          />
        </div>
      </Modal>
    </div>
  );
}

export default ProductListPage;
