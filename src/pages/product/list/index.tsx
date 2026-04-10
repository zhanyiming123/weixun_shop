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
  Select,
  Switch,
  Table,
  Tag,
  Tabs,
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './index.module.less';
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
  DEFAULT_INVENTORY_UNIT,
  DEFAULT_FILTER_VALUES,
  filterProductsByStoreIds,
  filterProductStoreConfigsByStoreIds,
  getProductSourceLabel,
  ProductFilterValues,
  ProductItem,
  ProductSearchType,
  ProductStatus,
  PRODUCT_SOURCE_OPTIONS,
  useProductItems,
} from './data';
import {
  buildProductStoreDetailItems,
  getProductStoreById,
  getProductStoreSummary,
  maskPhone,
  PRODUCT_STORE_TYPE_LABEL_MAP,
  ProductStoreDetailItem,
  ProductStoreSellStatus,
  readProductStoreItems,
} from '../store-config/data';
import { GlobalState } from '@/store';
import { filterStoreItemsByIds } from '@/utils/organization';

type ProductTab = 'all' | 'selling' | 'warehouse';
type ProductCreateActionMode = 'edit' | 'copy';

const STORE_DETAIL_PAGE_SIZE_OPTIONS = [20, 50];

const Option = Select.Option;
const TabPane = Tabs.TabPane;
const RangePicker = DatePicker.RangePicker;

function getDefaultFilterValues(): ProductFilterValues {
  return {
    ...DEFAULT_FILTER_VALUES,
    createdAtRange: [],
  };
}

function getDateTimestamp(dateTime: string) {
  return new Date(dateTime.replace(' ', 'T')).getTime();
}

function getRangeBoundary(date: string, endOfDay = false) {
  const suffix = endOfDay ? '23:59:59' : '00:00:00';
  return new Date(`${date}T${suffix}`).getTime();
}

function formatCurrency(price: number) {
  return `¥${price.toFixed(2)}`;
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

function getProductsByTab(products: ProductItem[], tab: ProductTab) {
  if (tab === 'selling') {
    return products.filter((item) => item.status === 'on');
  }

  if (tab === 'warehouse') {
    return products.filter((item) => item.status === 'off');
  }

  return products;
}

function applyFilters(products: ProductItem[], filters: ProductFilterValues) {
  const keyword = filters.keyword.trim().toLowerCase();

  return products.filter((item) => {
    if (keyword) {
      const target =
        filters.searchType === 'productId'
          ? item.id.toLowerCase()
          : item.name.toLowerCase();
      if (!target.includes(keyword)) {
        return false;
      }
    }

    if (
      filters.productCatalogId &&
      item.productCatalogId !== filters.productCatalogId
    ) {
      return false;
    }

    if (
      filters.productOwnershipId &&
      item.productOwnershipId !== filters.productOwnershipId
    ) {
      return false;
    }

    if (
      filters.productSourceType &&
      item.sourceType !== filters.productSourceType
    ) {
      return false;
    }

    if (
      typeof filters.minPrice === 'number' &&
      Number.isFinite(filters.minPrice) &&
      item.price < filters.minPrice
    ) {
      return false;
    }

    if (
      typeof filters.maxPrice === 'number' &&
      Number.isFinite(filters.maxPrice) &&
      item.price > filters.maxPrice
    ) {
      return false;
    }

    if (filters.createdAtRange.length === 2) {
      const [startDate, endDate] = filters.createdAtRange;
      const createdAt = getDateTimestamp(item.createdAt);
      if (createdAt < getRangeBoundary(startDate)) {
        return false;
      }
      if (createdAt > getRangeBoundary(endDate, true)) {
        return false;
      }
    }

    return true;
  });
}

function ProductListPage() {
  const history = useHistory();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const isHeadquarter = currentOrganization?.scope === 'headquarter';
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const allStoreItems = useMemo(() => readProductStoreItems(), []);
  const productCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const productOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const [products, setProducts] = useProductItems();
  const [formValues, setFormValues] = useState<ProductFilterValues>(
    getDefaultFilterValues()
  );
  const [appliedFilters, setAppliedFilters] = useState<ProductFilterValues>(
    getDefaultFilterValues()
  );
  const [activeTab, setActiveTab] = useState<ProductTab>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>(
    []
  );
  const [storeDetailTarget, setStoreDetailTarget] = useState<{
    product: ProductItem;
    sellStatus: ProductStoreSellStatus;
  } | null>(null);
  const [storeDetailPage, setStoreDetailPage] = useState(1);
  const [storeDetailPageSize, setStoreDetailPageSize] = useState(20);
  const visibleStoreIds = currentOrganization?.storeIds || [];
  const visibleStoreItems = useMemo(
    () =>
      isHeadquarter
        ? allStoreItems
        : filterStoreItemsByIds(allStoreItems, visibleStoreIds),
    [allStoreItems, isHeadquarter, visibleStoreIds]
  );
  const scopedProducts = useMemo(
    () =>
      isHeadquarter ? products : filterProductsByStoreIds(products, visibleStoreIds),
    [isHeadquarter, products, visibleStoreIds]
  );

  const filteredProducts = useMemo(
    () => applyFilters(scopedProducts, appliedFilters),
    [appliedFilters, scopedProducts]
  );

  const tabCounts = useMemo(
    () => ({
      all: filteredProducts.length,
      selling: filteredProducts.filter((item) => item.status === 'on').length,
      warehouse: filteredProducts.filter((item) => item.status === 'off').length,
    }),
    [filteredProducts]
  );

  const tableData = useMemo(
    () => getProductsByTab(filteredProducts, activeTab),
    [filteredProducts, activeTab]
  );
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
    setStoreDetailPage(1);
  }, [storeDetailTarget]);

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
      createdAtRange: [...formValues.createdAtRange],
    });
    setSelectedRowKeys([]);
  }

  function handleReset() {
    const nextValues = getDefaultFilterValues();
    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setActiveTab('all');
    setSelectedRowKeys([]);
  }

  function goToProductCreate(mode: ProductCreateActionMode, record: ProductItem) {
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

  function openStoreDetailModal(
    product: ProductItem,
    sellStatus: ProductStoreSellStatus
  ) {
    setStoreDetailTarget({
      product,
      sellStatus,
    });
    setStoreDetailPage(1);
    setStoreDetailPageSize(20);
  }

  function updateProductStatus(ids: string[], nextStatus: ProductStatus) {
    setProducts((prev) =>
      prev.map((item) =>
        ids.includes(item.id) ? { ...item, status: nextStatus } : item
      )
    );
  }

  function handleRowStatusChange(checked: boolean, record: ProductItem) {
    updateProductStatus([record.id], checked ? 'on' : 'off');
    Message.success(
      `${record.name}已${checked ? '上架' : '下架'}`
    );
  }

  function handleBatchStatusChange(nextStatus: ProductStatus) {
    if (!selectedRowKeys.length) {
      return;
    }

    const ids = selectedRowKeys.map(String);
    updateProductStatus(ids, nextStatus);
    setSelectedRowKeys([]);
    Message.success(
      `已批量${nextStatus === 'on' ? '上架' : '下架'}${ids.length}个商品`
    );
  }

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 360,
      render: (_: string, record: ProductItem) => (
        <div className={styles.nameCell}>
          <Typography.Text className={styles.productName}>
            {record.name}
          </Typography.Text>
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
      render: (_: string, record: ProductItem) => {
        const sourceStore = record.sourceStoreId
          ? getProductStoreById(record.sourceStoreId, allStoreItems)
          : undefined;

        return getProductSourceLabel(record.sourceType, sourceStore?.name);
      },
    },
    {
      title: '上架状态',
      dataIndex: 'status',
      width: 170,
      render: (value: ProductStatus, record: ProductItem) => (
        <Switch
          className={styles.statusSwitch}
          checked={value === 'on'}
          checkedText="上架"
          uncheckedText="下架"
          onChange={(checked) => handleRowStatusChange(checked, record)}
        />
      ),
    },
    {
      title: '商品售价',
      dataIndex: 'price',
      width: 140,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 140,
      render: (value: number, record: ProductItem) =>
        `${value} ${record.inventoryUnit || DEFAULT_INVENTORY_UNIT}`,
      sorter: (a: ProductItem, b: ProductItem) => a.stock - b.stock,
    },
    {
      title: '销售店铺',
      dataIndex: 'storeConfigs',
      width: 220,
      render: (value: ProductItem['storeConfigs'], record: ProductItem) => {
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
      sorter: (a: ProductItem, b: ProductItem) =>
        getDateTimestamp(a.createdAt) - getDateTimestamp(b.createdAt),
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 240,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductItem) => (
        <span className={styles.actionLinks}>
          <Link
            className={styles.actionLinkButton}
            onClick={() => showPendingMessage(`${record.name}详情暂未实现`)}
          >
            详情
          </Link>
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
              <Select
                allowClear
                className={styles.typeSelect}
                placeholder="请选择商品来源"
                value={formValues.productSourceType}
                onChange={(value) =>
                  updateFormValue('productSourceType', value || undefined)
                }
              >
                {PRODUCT_SOURCE_OPTIONS.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
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
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            scroll={{ x: 1900 }}
            tableLayoutFixed
          />
        </div>
      </Card>

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
