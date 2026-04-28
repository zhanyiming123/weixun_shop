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
  getProductIndependentPriceRule,
  resolveSourceStoreMetaById,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import { ProductService } from '@/services/ProductService';
import { GlobalState } from '@/store';
import type {
  ProductFilterValues,
  ProductKind,
  ProductSearchType,
  ProductSharePoolItem,
  ProductShareStatus,
  ProductStoreSkuViewItem,
} from '@/types/product';
import { filterStoreItemsByIds } from '@/utils/organization';

type ProductSourceFilterOption = {
  label: string;
  value: string;
  children?: ProductSourceFilterOption[];
};

type SharePoolKindTab = 'all' | ProductKind;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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

function getIndependentConfigLabel(product: ProductSharePoolItem) {
  return getProductIndependentPriceRule(product).enabled
    ? '允许独立售价'
    : '不支持独立售价';
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
  const [activeKindTab, setActiveKindTab] = useState<SharePoolKindTab>('all');
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
            status: status === 'all' ? undefined : status,
            productKind: activeKindTab === 'all' ? undefined : activeKindTab,
            filters: appliedFilters,
            page: currentPage,
            pageSize,
          })
        : {
            items: [] as ProductSharePoolItem[],
            total: 0,
          },
    [
      activeKindTab,
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
    setActiveKindTab('all');
    setCurrentPage(1);
  }

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
                  formValues.createdAtRange.length ? formValues.createdAtRange : undefined
                }
                onChange={handleRangeChange}
              />
            </div>

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
          activeTab={activeKindTab}
          className={styles.tabs}
          destroyOnHide={false}
          onChange={(key) => {
            setActiveKindTab(key as SharePoolKindTab);
            setCurrentPage(1);
          }}
        >
          <TabPane key="all" title="全部" />
          <TabPane key="standard" title="单商品" />
          <TabPane key="bundle" title="商品套餐" />
        </Tabs>

        <div className={styles.toolbar}>
          <Typography.Text>共享池商品共 {queryResult.total} 条</Typography.Text>
        </div>

        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            columns={[
              {
                title: '商品名称',
                dataIndex: 'name',
                width: 360,
                render: (_: string, record: ProductSharePoolItem) => (
                  <div className={styles.nameCell}>
                    <div className={styles.productTitleRow}>
                      <Tag color={record.productKind === 'bundle' ? 'purple' : 'arcoblue'}>
                        {record.productKind === 'bundle' ? '套餐' : '单品'}
                      </Tag>
                      <Typography.Text className={styles.productName}>
                        {record.name}
                      </Typography.Text>
                    </div>
                    <Typography.Text className={styles.productId}>id: {record.id}</Typography.Text>
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
                render: (_: unknown, record: ProductSharePoolItem) => (
                  <Tag color={getProductIndependentPriceRule(record).enabled ? 'green' : 'gray'}>
                    {getIndependentConfigLabel(record)}
                  </Tag>
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
            ]}
            data={queryResult.items}
            noDataElement="暂无共享商品"
            pagination={false}
            tableLayoutFixed
            scroll={{ x: 2060 }}
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

      <Modal
        title={
          viewTarget
            ? `${viewTarget.productKind === 'bundle' ? '套餐' : '商品'}详情`
            : '商品详情'
        }
        visible={Boolean(viewTarget)}
        footer={null}
        style={{ width: 980 }}
        onCancel={() => setViewTarget(null)}
      >
        {viewTarget && (
          <div className={styles.storeDetailModal}>
            <Typography.Text type="secondary">
              已隐藏店铺渠道配置相关项，以下为可查看的商品配置。
            </Typography.Text>

            <div>
              <Typography.Title heading={6}>基础信息</Typography.Title>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px 20px',
                }}
              >
                <Typography.Text>商品名称：{viewTarget.name}</Typography.Text>
                <Typography.Text>商品 ID：{viewTarget.id}</Typography.Text>
                <Typography.Text>
                  商品类目：
                  {getProductCatalogFullLabel(viewTarget.productCatalogId, catalogItems)}
                </Typography.Text>
                <Typography.Text>
                  商品分类：
                  {getProductOwnershipFullLabel(viewTarget.productOwnershipId, ownershipItems)}
                </Typography.Text>
                <Typography.Text>
                  商品来源：{viewTarget.storeView.sourceStoreName || '--'}
                </Typography.Text>
                <Typography.Text>
                  商品售价：
                  {formatPriceRange(
                    viewTarget.storeView.currentSkus.map((sku) => sku.currentPrice)
                  )}
                </Typography.Text>
                <Typography.Text>
                  库存：{viewTarget.stock} {viewTarget.inventoryUnit || '份'}
                </Typography.Text>
                <Typography.Text>创建时间：{viewTarget.createdAt}</Typography.Text>
                <Typography.Text>
                  分享时间：{viewTarget.shareTarget.sharedAt || '--'}
                </Typography.Text>
              </div>
            </div>

            {(viewTarget.storeView.currentCarouselImages || []).length > 0 && (
              <div>
                <Typography.Title heading={6}>商品轮播图</Typography.Title>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  {viewTarget.storeView.currentCarouselImages.map((image) => (
                    <div key={image.id} style={{ width: 160 }}>
                      <img
                        alt={image.name}
                        src={image.url}
                        style={{
                          width: '100%',
                          height: 96,
                          borderRadius: 4,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <Typography.Text type="secondary">{image.name}</Typography.Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Typography.Title heading={6}>规格配置</Typography.Title>
              <Table
                rowKey="id"
                columns={[
                  {
                    title: 'SKU名称',
                    dataIndex: 'specText',
                    render: (_: string, sku: ProductStoreSkuViewItem, index: number) => (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 0,
                        }}
                      >
                        {sku.isLocalSku && (
                          <Tag color="arcoblue">本店新增</Tag>
                        )}
                        <Typography.Text ellipsis>
                          {getSkuLabel(sku, index)}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  {
                    title: '售价',
                    dataIndex: 'currentPrice',
                    width: 140,
                    render: (value: number) => formatPriceNumber(value),
                  },
                  {
                    title: '库存',
                    dataIndex: 'currentStock',
                    width: 120,
                  },
                  {
                    title: '状态',
                    dataIndex: 'currentStatus',
                    width: 120,
                    render: (value: ProductStoreSkuViewItem['currentStatus']) =>
                      value === 'on' ? '上架' : '下架',
                  },
                ]}
                data={viewTarget.storeView.currentSkus}
                noDataElement="暂无规格数据"
                pagination={false}
                tableLayoutFixed
              />
            </div>

            {viewTarget.productKind === 'bundle' && (
              <div>
                <Typography.Title heading={6}>套餐组合</Typography.Title>
                <Table
                  rowKey={(item) => `${item.productId}_${item.skuId}`}
                  columns={[
                    {
                      title: '组件商品 ID',
                      dataIndex: 'productId',
                    },
                    {
                      title: '组件 SKU ID',
                      dataIndex: 'skuId',
                    },
                  ]}
                  data={viewTarget.bundleComponents || []}
                  noDataElement="暂无套餐组合数据"
                  pagination={false}
                  tableLayoutFixed
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ProductSharePoolPage;
