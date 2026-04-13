import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Cascader,
  Card,
  DatePicker,
  Drawer,
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
  Typography,
  Upload,
} from '@arco-design/web-react';
import type { RequestOptions } from '@arco-design/web-react/es/Upload/interface';
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
  resolveSourceStoreMetaById,
} from '@/lib/product';
import { formatCurrency } from '@/lib/format';
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
  nameMode: ProductStoreOverrideMode;
  overrideName: string;
  carouselMode: ProductStoreOverrideMode;
  overrideCarouselImages: ProductCarouselImage[];
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function createCarouselImageId() {
  return `carousel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    nameMode: product.storeView.nameMode,
    overrideName: product.storeView.currentName,
    carouselMode: product.storeView.carouselMode,
    overrideCarouselImages: cloneCarouselImages(
      product.storeView.currentCarouselImages
    ),
  };
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
    await productService.updateProductStatus(ids, nextStatus);
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

  function closeStoreSettingDrawer() {
    setStoreSettingTarget(null);
    setStoreSettingDraft(null);
    setStoreSettingSaving(false);
  }

  function openStoreSettingDrawer(product: ProductListItem) {
    setStoreSettingTarget(product);
  }

  function patchStoreSettingDraft(patch: Partial<ProductStoreSettingDraft>) {
    setStoreSettingDraft((previous) =>
      previous
        ? {
            ...previous,
            ...patch,
          }
        : previous
    );
  }

  function handlePriceModeChange(value: string) {
    setStoreSettingDraft((previous) => {
      if (!previous || !storeSettingTarget) {
        return previous;
      }

      return {
        ...previous,
        priceMode: value as ProductStorePriceMode,
        currentPrice:
          value === 'independent'
            ? previous.currentPrice ?? storeSettingTarget.storeView.currentPrice
            : previous.currentPrice,
      };
    });
  }

  function handleNameModeChange(value: string) {
    setStoreSettingDraft((previous) => {
      if (!previous || !storeSettingTarget) {
        return previous;
      }

      return {
        ...previous,
        nameMode: value as ProductStoreOverrideMode,
        overrideName:
          value === 'override'
            ? previous.overrideName || storeSettingTarget.storeView.currentName
            : previous.overrideName,
      };
    });
  }

  function handleCarouselModeChange(value: string) {
    setStoreSettingDraft((previous) => {
      if (!previous || !storeSettingTarget) {
        return previous;
      }

      return {
        ...previous,
        carouselMode: value as ProductStoreOverrideMode,
        overrideCarouselImages:
          value === 'override' && !previous.overrideCarouselImages.length
            ? cloneCarouselImages(storeSettingTarget.storeView.currentCarouselImages)
            : previous.overrideCarouselImages,
      };
    });
  }

  async function handleStoreSettingCarouselUpload(option: RequestOptions) {
    if (!storeSettingDraft || storeSettingDraft.overrideCarouselImages.length >= 8) {
      Message.warning('最多上传 8 张轮播图');
      option.onSuccess?.({});
      return;
    }

    const file = option.file as File;

    if (!file) {
      option.onError?.(new Error('文件不存在'));
      return;
    }

    try {
      const nextUrl = await readFileAsDataUrl(file);
      setStoreSettingDraft((previous) =>
        previous
          ? {
              ...previous,
              overrideCarouselImages: [
                ...previous.overrideCarouselImages,
                {
                  id: createCarouselImageId(),
                  name: file.name || `图片${previous.overrideCarouselImages.length + 1}`,
                  url: nextUrl,
                },
              ],
            }
          : previous
      );
      option.onSuccess?.({});
    } catch (error) {
      option.onError?.(error);
      Message.error('图片读取失败，请重试');
    }
  }

  function handleStoreSettingCarouselRemove(imageId: string) {
    setStoreSettingDraft((previous) =>
      previous
        ? {
            ...previous,
            overrideCarouselImages: previous.overrideCarouselImages.filter(
              (item) => item.id !== imageId
            ),
          }
        : previous
    );
  }

  function handleStoreSettingCarouselMoveToFirst(imageId: string) {
    setStoreSettingDraft((previous) => {
      if (!previous) {
        return previous;
      }

      const targetIndex = previous.overrideCarouselImages.findIndex(
        (item) => item.id === imageId
      );

      if (targetIndex <= 0) {
        return previous;
      }

      const nextImages = [...previous.overrideCarouselImages];
      const [target] = nextImages.splice(targetIndex, 1);
      nextImages.unshift(target);

      return {
        ...previous,
        overrideCarouselImages: nextImages,
      };
    });
  }

  async function handleStoreSettingSubmit() {
    if (!storeSettingTarget || !storeSettingDraft || !currentStoreId) {
      return;
    }

    try {
      setStoreSettingSaving(true);
      await productService.updateProductStoreOverride({
        productId: storeSettingTarget.id,
        storeId: currentStoreId,
        priceMode: storeSettingDraft.priceMode,
        currentPrice: storeSettingDraft.currentPrice,
        nameMode: storeSettingDraft.nameMode,
        overrideName: storeSettingDraft.overrideName,
        carouselMode: storeSettingDraft.carouselMode,
        overrideCarouselImages: storeSettingDraft.overrideCarouselImages,
      });
      Message.success('本店设置已保存');
      closeStoreSettingDrawer();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setStoreSettingSaving(false);
      Message.error(getErrorMessage(error));
    }
  }

  function getStoreSettingSummary(record: ProductListItem) {
    const summaries: string[] = [];

    if (record.storeView.priceMode === 'independent') {
      summaries.push('独立售价');
    }

    if (record.storeView.nameMode === 'override') {
      summaries.push('名称本店设置');
    }

    if (record.storeView.carouselMode === 'override') {
      summaries.push('轮播图本店设置');
    }

    return summaries.join(' / ');
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
            {record.storeView.hasStoreSetting && (
              <Tag className={styles.settingTag} color="arcoblue">
                本店设置
              </Tag>
            )}
          </div>
          {record.storeView.hasStoreSetting && (
            <Typography.Text className={styles.productSettingSummary}>
              {getStoreSettingSummary(record)}
            </Typography.Text>
          )}
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
          {record.storeView.sourceRegionName && (
            <Tag className={styles.sourceRegionTag} color="arcoblue">
              {record.storeView.sourceRegionName}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '上架状态',
      dataIndex: 'status',
      width: 170,
      render: (value: ProductStatus, record: ProductListItem) => (
        <Switch
          className={styles.statusSwitch}
          checked={value === 'on'}
          checkedText="上架"
          uncheckedText="下架"
          disabled={Boolean(currentStoreId) && record.storeView.isShared}
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
      render: (_: number, record: ProductListItem) =>
        record.storeView.isShared ? (
          <div className={styles.priceInfoCell}>
            <div className={styles.priceInfoRow}>
              <span className={styles.priceInfoLabel}>原售价</span>
              <span>{formatCurrency(record.storeView.originalPrice)}</span>
            </div>
            <div className={styles.priceInfoRow}>
              <span className={styles.priceInfoLabel}>现售价</span>
              <span className={styles.priceCurrentValue}>
                {formatCurrency(record.storeView.currentPrice)}
              </span>
              {record.storeView.priceMode === 'independent' && (
                <Tag className={styles.priceStatusTag} color="gold">
                  独立售价
                </Tag>
              )}
            </div>
          </div>
        ) : (
          formatCurrency(record.storeView.currentPrice)
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
          {record.storeView.canManageStoreSettings ? (
            <Link
              className={styles.actionLinkButton}
              onClick={() => openStoreSettingDrawer(record)}
            >
              本店设置
            </Link>
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
          <Link
            className={styles.actionLinkButton}
            onClick={() => showPendingMessage(`${record.name}库存管理暂未实现`)}
          >
            库存
          </Link>
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

      <Drawer
        className={styles.storeSettingDrawer}
        placement="right"
        title="本店设置"
        visible={Boolean(storeSettingTarget)}
        width="min(720px, calc(100vw - 32px))"
        okText="保存"
        cancelText="取消"
        confirmLoading={storeSettingSaving}
        onCancel={closeStoreSettingDrawer}
        onOk={handleStoreSettingSubmit}
      >
        {storeSettingTarget && storeSettingDraft && (
          <div className={styles.storeSettingBody}>
            <div className={styles.storeSettingIntroCard}>
              <div className={styles.storeSettingHeader}>
                <Typography.Text className={styles.storeSettingProductName}>
                  {storeSettingTarget.name}
                </Typography.Text>
                <div className={styles.storeSettingHeaderTags}>
                  {storeSettingTarget.storeView.sourceStoreName && (
                    <Tag color="arcoblue">
                      {storeSettingTarget.storeView.sourceStoreName}
                    </Tag>
                  )}
                  {storeSettingTarget.storeView.sourceRegionName && (
                    <Tag color="green">{storeSettingTarget.storeView.sourceRegionName}</Tag>
                  )}
                  {storeSettingTarget.storeView.hasStoreSetting && (
                    <Tag color="green">本店设置</Tag>
                  )}
                </div>
              </div>
              <Typography.Paragraph className={styles.storeSettingIntroText}>
                原商品信息保持不变，本店仅维护当前门店自己的售价、名称和轮播图。
              </Typography.Paragraph>
            </div>

            <div className={styles.storeSettingSection}>
              <div className={styles.storeSettingSectionHeader}>
                <div>
                  <Typography.Text className={styles.storeSettingSectionTitle}>
                    价格设置
                  </Typography.Text>
                  <Typography.Text className={styles.storeSettingSectionHint}>
                    原商品改价只影响原售价，不会覆盖本店现售价。
                  </Typography.Text>
                </div>
                {storeSettingDraft.priceMode === 'independent' && (
                  <Link onClick={() => handlePriceModeChange('follow')}>
                    恢复跟随原售价
                  </Link>
                )}
              </div>

              <div className={styles.settingCompareGrid}>
                <div className={styles.settingMetricCard}>
                  <span className={styles.settingMetricLabel}>原售价</span>
                  <span className={styles.settingMetricValue}>
                    {formatCurrency(storeSettingTarget.storeView.originalPrice)}
                  </span>
                </div>
                <div className={styles.settingMetricCard}>
                  <span className={styles.settingMetricLabel}>现售价</span>
                  <span className={styles.settingMetricValue}>
                    {formatCurrency(
                      storeSettingDraft.priceMode === 'independent'
                        ? Number(
                            storeSettingDraft.currentPrice ??
                              storeSettingTarget.storeView.currentPrice
                          )
                        : storeSettingTarget.storeView.originalPrice
                    )}
                  </span>
                </div>
              </div>

              <Radio.Group
                value={storeSettingDraft.priceMode}
                onChange={handlePriceModeChange}
              >
                <Radio value="follow">跟随原售价</Radio>
                <Radio value="independent">独立售价</Radio>
              </Radio.Group>

              {storeSettingDraft.priceMode === 'independent' && (
                <InputNumber
                  className={styles.settingInput}
                  min={0}
                  precision={2}
                  placeholder="请输入现售价"
                  value={storeSettingDraft.currentPrice}
                  onChange={(value) =>
                    patchStoreSettingDraft({
                      currentPrice:
                        typeof value === 'number' ? value : undefined,
                    })
                  }
                />
              )}
            </div>

            <div className={styles.storeSettingSection}>
              <div className={styles.storeSettingSectionHeader}>
                <div>
                  <Typography.Text className={styles.storeSettingSectionTitle}>
                    名称设置
                  </Typography.Text>
                  <Typography.Text className={styles.storeSettingSectionHint}>
                    默认跟随原商品名称，需要时可切换为本店名称。
                  </Typography.Text>
                </div>
                {storeSettingDraft.nameMode === 'override' && (
                  <Link onClick={() => handleNameModeChange('follow')}>
                    恢复跟随原名称
                  </Link>
                )}
              </div>

              <div className={styles.settingCompareGrid}>
                <div className={styles.settingMetricCard}>
                  <span className={styles.settingMetricLabel}>原名称</span>
                  <span className={styles.settingTextValue}>
                    {storeSettingTarget.storeView.originalName}
                  </span>
                </div>
                <div className={styles.settingMetricCard}>
                  <span className={styles.settingMetricLabel}>当前展示</span>
                  <span className={styles.settingTextValue}>
                    {storeSettingDraft.nameMode === 'override'
                      ? storeSettingDraft.overrideName ||
                        storeSettingTarget.storeView.originalName
                      : storeSettingTarget.storeView.originalName}
                  </span>
                </div>
              </div>

              <Radio.Group
                value={storeSettingDraft.nameMode}
                onChange={handleNameModeChange}
              >
                <Radio value="follow">跟随原名称</Radio>
                <Radio value="override">本店设置</Radio>
              </Radio.Group>

              {storeSettingDraft.nameMode === 'override' && (
                <Input
                  className={styles.settingInput}
                  maxLength={30}
                  placeholder="请输入本店名称"
                  value={storeSettingDraft.overrideName}
                  onChange={(value) =>
                    patchStoreSettingDraft({
                      overrideName: value,
                    })
                  }
                />
              )}
            </div>

            <div className={styles.storeSettingSection}>
              <div className={styles.storeSettingSectionHeader}>
                <div>
                  <Typography.Text className={styles.storeSettingSectionTitle}>
                    轮播图设置
                  </Typography.Text>
                  <Typography.Text className={styles.storeSettingSectionHint}>
                    默认跟随原轮播图，可切换为本店单独维护。
                  </Typography.Text>
                </div>
                {storeSettingDraft.carouselMode === 'override' && (
                  <Link onClick={() => handleCarouselModeChange('follow')}>
                    恢复跟随原轮播图
                  </Link>
                )}
              </div>

              <Radio.Group
                value={storeSettingDraft.carouselMode}
                onChange={handleCarouselModeChange}
              >
                <Radio value="follow">跟随原轮播图</Radio>
                <Radio value="override">本店设置</Radio>
              </Radio.Group>

              {storeSettingDraft.carouselMode === 'override' && (
                <div className={styles.carouselEditor}>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={handleStoreSettingCarouselUpload}
                  >
                    <Button type="outline">上传轮播图</Button>
                  </Upload>
                  <Typography.Text className={styles.carouselHint}>
                    最多上传 8 张，首张默认为主图。
                  </Typography.Text>
                </div>
              )}

              <div className={styles.carouselPreviewGrid}>
                {(storeSettingDraft.carouselMode === 'override'
                  ? storeSettingDraft.overrideCarouselImages
                  : storeSettingTarget.storeView.originalCarouselImages
                ).length ? (
                  (storeSettingDraft.carouselMode === 'override'
                    ? storeSettingDraft.overrideCarouselImages
                    : storeSettingTarget.storeView.originalCarouselImages
                  ).map((item, index) => (
                    <div key={item.id} className={styles.carouselPreviewCard}>
                      <div className={styles.carouselPreviewImageBox}>
                        <img
                          alt={item.name || `轮播图${index + 1}`}
                          className={styles.carouselPreviewImage}
                          src={item.url}
                        />
                      </div>
                      <div className={styles.carouselPreviewFooter}>
                        <span className={styles.carouselPreviewOrder}>
                          {index === 0 ? '主图' : `第 ${index + 1} 张`}
                        </span>
                        {storeSettingDraft.carouselMode === 'override' && (
                          <div className={styles.carouselPreviewActions}>
                            {index > 0 && (
                              <Button
                                size="mini"
                                type="text"
                                onClick={() =>
                                  handleStoreSettingCarouselMoveToFirst(item.id)
                                }
                              >
                                设为首图
                              </Button>
                            )}
                            <Button
                              size="mini"
                              status="danger"
                              type="text"
                              onClick={() =>
                                handleStoreSettingCarouselRemove(item.id)
                              }
                            >
                              删除
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.carouselEmpty}>
                    当前暂无轮播图
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

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
