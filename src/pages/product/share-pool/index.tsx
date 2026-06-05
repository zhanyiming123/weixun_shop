import React, { useMemo, useState } from 'react';
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
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import styles from '@/pages/product/list/index.module.less';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogFullLabel,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipFullLabel,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import {
  createDefaultFilterValues,
  resolveSourceStoreMetaById,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import ProductDetailModal from '@/pages/product/components/product-detail-modal';
import {
  canShowIndependentPriceTag,
  getIndependentConfigLabel,
} from '@/pages/product/share-pool/independent-config';
import { formatComboSubProductSummary } from '@/pages/product/combo/sub-product-display';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import { ProductService } from '@/services/ProductService';
import { GlobalState } from '@/store';
import type {
  ProductComboDisplayOption,
  ProductFilterValues,
  ProductSearchType,
  ProductSharePoolItem,
  ProductShareStatus,
  ProductStoreSellStatus,
} from '@/types/product';
import { filterStoreItemsByIds } from '@/utils/organization';
import { PRODUCT_STORE_SELL_STATUS_LABEL_MAP } from '@/pages/product/store-config/data';
import {
  getSharePoolQueryStatus,
  getSharePoolTableColumnKeys,
  getSharePoolViewConfig,
  type SharePoolPageTab,
  type SharePoolTableColumnKey,
} from '@/pages/product/share-pool/view-config';

type ProductSourceFilterOption = {
  label: string;
  value: string;
  children?: ProductSourceFilterOption[];
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];
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

const Option = Select.Option;
const TabPane = Tabs.TabPane;
const RangePicker = DatePicker.RangePicker;

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

function formatSinglePrice(price?: number) {
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return '--';
  }

  return formatPriceNumber(price);
}

function normalizeSharePoolDisplayName(name: string) {
  return name.replace(/^\[引用\]\s*/, '').trim();
}

function getRecordSellStatus(record: ProductSharePoolItem): ProductStoreSellStatus {
  if (record.storeView.currentStoreSellStatus) {
    return record.storeView.currentStoreSellStatus;
  }

  return (record.storeConfigs || []).some((item) => item.sellStatus === 'sellable')
    ? 'sellable'
    : 'unsellable';
}

function ProductSharePoolPage() {
  const productService = useMemo(() => new ProductService(), []);
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const organizationItems = useMemo(
    () => readOrganizationItems().filter((item) => item.status === 'enabled'),
    []
  );
  const allSourceStoreItems = useMemo(
    () => readProductStoreItems().filter((item) => item.type === 'store'),
    []
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
  const [statusInput, setStatusInput] = useState<'all' | ProductShareStatus>('all');
  const [status, setStatus] = useState<'all' | ProductShareStatus>('all');
  const [activeTab, setActiveTab] = useState<SharePoolPageTab>('standard');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [operatingId, setOperatingId] = useState('');
  const [viewTarget, setViewTarget] = useState<ProductSharePoolItem | null>(null);
  const visibleStoreIds = useMemo(
    () => currentOrganization?.storeIds || [],
    [currentOrganization?.storeIds]
  );
  const currentStoreId =
    currentOrganization?.scope === 'store' && visibleStoreIds.length === 1
      ? visibleStoreIds[0]
      : undefined;
  const visibleSourceStoreItems = useMemo(
    () =>
      currentOrganization?.scope === 'headquarter'
        ? allSourceStoreItems
        : filterStoreItemsByIds(allSourceStoreItems, visibleStoreIds),
    [allSourceStoreItems, currentOrganization?.scope, visibleStoreIds]
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
      currentStoreId
        ? productService.querySharePool({
            storeId: currentStoreId,
            status: getSharePoolQueryStatus(activeTab, status),
            productKind: getSharePoolViewConfig(activeTab).productKind,
            filters: appliedFilters,
            page: currentPage,
            pageSize,
          })
        : {
            items: [] as ProductSharePoolItem[],
            total: 0,
          },
    [
      activeTab,
      appliedFilters,
      currentPage,
      currentStoreId,
      pageSize,
      productService,
      refreshKey,
      status,
    ]
  );

  function updateFormValue<K extends keyof ProductFilterValues>(
    field: K,
    value: ProductFilterValues[K]
  ) {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }));
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
    setStatus(statusInput);
    setCurrentPage(1);
  }

  function handleReset() {
    const nextValues = createDefaultFilterValues();
    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setSourceFilterPaths([]);
    setStatusInput('all');
    setStatus('all');
    setCurrentPage(1);
  }

  const viewConfig = getSharePoolViewConfig(activeTab);
  const columns = useMemo(
    () => {
      const visibleColumnKeys = new Set<SharePoolTableColumnKey>(
        getSharePoolTableColumnKeys(activeTab)
      );
      const activeColumns =
        activeTab === 'combo'
          ? [
            {
              title: '商品名称',
              dataIndex: 'name',
              width: 320,
              render: (_: string, record: ProductSharePoolItem) => (
                <div className={styles.nameCell}>
                  <div className={styles.productTitleRow}>
                    <Typography.Text className={styles.productName}>
                      {normalizeSharePoolDisplayName(record.name)}
                    </Typography.Text>
                  </div>
                  <Typography.Text className={styles.productId}>
                    id: {record.id}
                  </Typography.Text>
                </div>
              ),
            },
            {
              title: '子商品',
              dataIndex: 'comboDisplayOptions',
              width: 320,
              render: (value: ProductComboDisplayOption[] | undefined) => {
                if (!(value || []).length) {
                  return <Typography.Text type="secondary">--</Typography.Text>;
                }

                return (
                  <Typography.Text>
                    {formatComboSubProductSummary(value || [])}
                  </Typography.Text>
                );
              },
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
              width: 240,
              render: (value: string) => getProductOwnershipFullLabel(value, ownershipItems),
            },
            {
              title: '商品来源',
              dataIndex: 'sourceStoreName',
              width: 200,
              render: (_: string, record: ProductSharePoolItem) =>
                record.storeView.sourceStoreName || '--',
            },
            {
              title: '可售状态',
              dataIndex: 'sellStatus',
              width: 116,
              render: (_: unknown, record: ProductSharePoolItem) => (
                <Tag color={getRecordSellStatus(record) === 'sellable' ? 'green' : 'red'}>
                  {PRODUCT_STORE_SELL_STATUS_LABEL_MAP[getRecordSellStatus(record)]}
                </Tag>
              ),
            },
            {
              title: '商品售价',
              dataIndex: 'price',
              width: 140,
              render: (_: number, record: ProductSharePoolItem) =>
                formatSinglePrice(record.storeView.currentPrice),
            },
            {
              title: '独立配置',
              dataIndex: 'independent',
              width: 160,
              render: (_: unknown, record: ProductSharePoolItem) =>
                canShowIndependentPriceTag(record) ? (
                  <Tag color="green">{getIndependentConfigLabel(record)}</Tag>
                ) : null,
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              width: 180,
            },
            {
              title: '共享时间',
              dataIndex: 'sharedAt',
              width: 180,
              render: (_: string, record: ProductSharePoolItem) =>
                record.shareTarget.sharedAt || '--',
            },
            {
              title: '操作',
              dataIndex: 'operations',
              width: 180,
              fixed: 'right' as const,
              render: (_: string, record: ProductSharePoolItem) => (
                <span className={styles.actionLinks}>
                  <Link
                    className={styles.actionLinkButton}
                    onClick={() => setViewTarget(record)}
                  >
                    查看
                  </Link>
                  {record.shareTarget.status === 'pending' ? (
                    <Link
                      className={styles.actionLinkButton}
                      onClick={() => handleReference(record)}
                    >
                      {operatingId === record.id ? '引用中...' : '引用商品'}
                    </Link>
                  ) : (
                    <Link className={styles.actionLinkButton} disabled>
                      已引用
                    </Link>
                  )}
                </span>
              ),
            },
          ]
          : [
            {
              title: '商品名称',
              dataIndex: 'name',
              width: 360,
              render: (_: string, record: ProductSharePoolItem) => (
                <div className={styles.nameCell}>
                  <div className={styles.productTitleRow}>
                    <Typography.Text className={styles.productName}>
                      {normalizeSharePoolDisplayName(record.name)}
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
              width: 240,
              render: (value: string) => getProductOwnershipFullLabel(value, ownershipItems),
            },
            {
              title: '商品来源',
              dataIndex: 'sourceStoreName',
              width: 200,
              render: (_: string, record: ProductSharePoolItem) =>
                record.storeView.sourceStoreName || '--',
            },
            {
              title: '商品售价',
              dataIndex: 'price',
              width: 180,
              render: (_: number, record: ProductSharePoolItem) =>
                formatPriceRange(record.storeView.currentSkus.map((sku) => sku.currentPrice)),
            },
            {
              title: '库存',
              dataIndex: 'stock',
              width: 140,
              render: (value: number, record: ProductSharePoolItem) =>
                `${value} ${record.inventoryUnit || '份'}`,
            },
            {
              title: '独立配置',
              dataIndex: 'independent',
              width: 180,
              render: (_: unknown, record: ProductSharePoolItem) =>
                canShowIndependentPriceTag(record) ? (
                  <Tag color="green">{getIndependentConfigLabel(record)}</Tag>
                ) : (
                  '--'
                ),
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              width: 180,
            },
            {
              title: '分享时间',
              dataIndex: 'sharedAt',
              width: 180,
              render: (_: string, record: ProductSharePoolItem) =>
                record.shareTarget.sharedAt || '--',
            },
            {
              title: '操作',
              dataIndex: 'operations',
              width: 220,
              fixed: 'right' as const,
              render: (_: string, record: ProductSharePoolItem) => (
                <span className={styles.actionLinks}>
                  <Link
                    className={styles.actionLinkButton}
                    onClick={() => setViewTarget(record)}
                  >
                    查看
                  </Link>
                  {record.shareTarget.status === 'pending' ? (
                    <Link
                      className={styles.actionLinkButton}
                      onClick={() => handleReference(record)}
                    >
                      {operatingId === record.id ? '引用中...' : '引用商品'}
                    </Link>
                  ) : (
                    <Link className={styles.actionLinkButton} disabled>
                      已引用
                    </Link>
                  )}
                </span>
              ),
            },
          ];

      return activeColumns.filter((column) =>
        visibleColumnKeys.has(column.dataIndex as SharePoolTableColumnKey)
      );
    },
    [
      activeTab,
      catalogItems,
      operatingId,
      ownershipItems,
    ]
  );

  async function handleReference(record: ProductSharePoolItem) {
    if (!currentStoreId) {
      Message.warning('请先切换到具体店铺后再引用');
      return;
    }

    if (operatingId || record.shareTarget.status !== 'pending') {
      return;
    }

    Modal.confirm({
      title: '确认引用商品',
      content: `确认引用「${record.name}」吗？`,
      okText: '确认引用',
      cancelText: '取消',
      onOk: async () => {
        try {
          setOperatingId(record.id);
          await productService.referenceSharedProduct({
            productId: record.id,
            storeId: currentStoreId,
          });
          Message.success('引用成功，已进入本店商品管理');
          setRefreshKey((value) => value + 1);
        } catch (error) {
          Message.error(getErrorMessage(error));
        } finally {
          setOperatingId('');
        }
      },
    });
  }

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: -16 }}>
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          destroyOnHide={false}
          onChange={(key) => {
            setActiveTab(key as SharePoolPageTab);
            setCurrentPage(1);
          }}
        >
          <TabPane key="standard" title="单商品" />
          <TabPane key="combo" title="组合商品" />
        </Tabs>
      </div>

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
                  onChange={(value) =>
                    updateFormValue('searchType', value as ProductSearchType)
                  }
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

            {viewConfig.showSubProductFilters && (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>子商品搜索</div>
                <Input.Group className={styles.searchGroup} compact>
                  <Select
                    bordered
                    className={styles.searchTypeSelect}
                    value={formValues.subProductSearchType}
                    onChange={(value) =>
                      updateFormValue(
                        'subProductSearchType',
                        value as ProductFilterValues['subProductSearchType']
                      )
                    }
                  >
                    <Option value="subProductName">子商品名称</Option>
                    <Option value="subProductCode">子商品 ID</Option>
                  </Select>
                  <Input
                    allowClear
                    className={styles.keywordInput}
                    placeholder="请输入搜索内容"
                    value={formValues.subProductKeyword}
                    onChange={(value) => updateFormValue('subProductKeyword', value)}
                  />
                </Input.Group>
              </div>
            )}

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

            {viewConfig.showSellStatusFilter && (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>可售状态</div>
                <Select
                  allowClear
                  className={styles.catalogCascader}
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
            )}

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>创建时间</div>
              <RangePicker
                className={styles.rangePicker}
                placeholder={['开始日期', '结束日期']}
                value={
                  formValues.createdAtRange.length ? formValues.createdAtRange : undefined
                }
                onChange={handleRangeChange}
              />
            </div>

            {viewConfig.showShareStatusFilter && (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>共享状态</div>
                <Select
                  className={styles.catalogCascader}
                  value={statusInput}
                  onChange={(value) => setStatusInput(value as 'all' | ProductShareStatus)}
                >
                  <Select.Option value="all">全部</Select.Option>
                  <Select.Option value="pending">待引用</Select.Option>
                  <Select.Option value="referenced">已引用</Select.Option>
                </Select>
              </div>
            )}
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
        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            columns={columns}
            data={queryResult.items}
            noDataElement="暂无共享商品"
            pagination={false}
            tableLayoutFixed
            scroll={{ x: activeTab === 'combo' ? 2200 : 2060 }}
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
            sizeOptions={PAGE_SIZE_OPTIONS}
            total={queryResult.total}
            onChange={(pageNumber, nextPageSize) => {
              setCurrentPage(nextPageSize === pageSize ? pageNumber : 1);
              setPageSize(nextPageSize);
            }}
          />
        </div>
      </Card>

      <ProductDetailModal
        product={viewTarget}
        visible={Boolean(viewTarget)}
        onCancel={() => setViewTarget(null)}
      />
    </div>
  );
}

export default ProductSharePoolPage;
