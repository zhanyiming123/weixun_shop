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
  Pagination,
  Select,
  Switch,
  Table,
  Tabs,
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
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
  DEFAULT_INVENTORY_UNIT,
  getProductCurrentStoreId,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { ProductService } from '@/services/ProductService';
import type {
  ProductFilterValues,
  ProductListItem,
  ProductSearchType,
  ProductStatus,
  ProductTab,
} from '@/types/product';
import { GlobalState } from '@/store';

const Option = Select.Option;
const TabPane = Tabs.TabPane;
const RangePicker = DatePicker.RangePicker;
const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50];

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

function getRecordDisplayStatus(record: ProductListItem): ProductStatus {
  if (record.storeView.currentStoreId) {
    return record.storeView.currentStoreSellStatus === 'sellable' ? 'on' : 'off';
  }

  return record.status;
}

function ProductBundlePage() {
  const productService = useMemo(() => new ProductService(), []);
  const history = useHistory();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const currentDemoIdentity = useSelector(
    (state: GlobalState) => state.currentDemoIdentity
  );
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
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
  const [activeTab, setActiveTab] = useState<ProductTab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIST_PAGE_SIZE_OPTIONS[0]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>(
    []
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
  const queryResult = useMemo(
    () =>
      productService.queryList({
        productKind: 'bundle',
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
      refreshKey,
      visibleStoreIds,
    ]
  );

  useEffect(() => {
    const visibleKeys = new Set(queryResult.items.map((item) => item.id));
    setSelectedRowKeys((previous) =>
      previous.filter((key) => visibleKeys.has(String(key)))
    );
  }, [queryResult.items]);

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
      createdAtRange: [...formValues.createdAtRange],
    });
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }

  function handleReset() {
    const nextValues = createDefaultFilterValues();
    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setActiveTab('all');
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }

  function goToBundleCreate(
    mode: 'create' | 'edit' | 'copy',
    record?: ProductListItem
  ) {
    history.push({
      pathname: '/product/bundle/create',
      search:
        mode !== 'create' && record
        ? `?${qs.stringify({
            mode,
            sourceId: record.id,
          })}`
        : '',
      state: mode !== 'create' && record
        ? {
            mode,
            sourceProduct: record,
          }
        : undefined,
    });
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

  async function handleRowStatusChange(checked: boolean, record: ProductListItem) {
    try {
      await updateProductStatus([record.id], checked ? 'on' : 'off');
      Message.success(
        `${record.name}已${checked ? (currentStoreId ? '设为可售' : '上架') : (currentStoreId ? '设为不可售' : '下架')}`
      );
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
        `已批量${nextStatus === 'on' ? (currentStoreId ? '设为可售' : '上架') : (currentStoreId ? '设为不可售' : '下架')}${ids.length}个套餐`
      );
    } catch (error) {
      Message.error(getErrorMessage(error));
    }
  }

  const columns = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      width: 360,
      render: (_: string, record: ProductListItem) => (
        <div className={styles.nameCell}>
          <div className={styles.productTitleRow}>
            <Typography.Text className={styles.productName}>{record.name}</Typography.Text>
          </div>
          <Typography.Text className={styles.productId}>id: {record.id}</Typography.Text>
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
      width: 220,
      render: (value: string) => getProductOwnershipFullLabel(value, ownershipItems),
    },
    {
      title: '商品来源',
      dataIndex: 'sourceStore',
      width: 220,
      render: (_: string, record: ProductListItem) =>
        record.storeView.sourceStoreName || '--',
    },
    {
      title: currentStoreId ? '可售状态' : '上架状态',
      dataIndex: 'status',
      width: 170,
      render: (_: ProductStatus, record: ProductListItem) => (
        <Switch
          className={styles.statusSwitch}
          checked={getRecordDisplayStatus(record) === 'on'}
          checkedText={currentStoreId ? '可售' : '上架'}
          uncheckedText={currentStoreId ? '不可售' : '下架'}
          disabled={Boolean(currentStoreId) && !record.storeView.canManageStoreStatus}
          onChange={(checked) => handleRowStatusChange(checked, record)}
        />
      ),
    },
    {
      title: '套餐价',
      dataIndex: 'price',
      width: 180,
      render: (value: number) => `¥${formatPriceNumber(value)}`,
    },
    {
      title: '套餐库存',
      dataIndex: 'stock',
      width: 180,
      render: (value: number, record: ProductListItem) =>
        `${value} ${record.inventoryUnit || DEFAULT_INVENTORY_UNIT}`,
      sorter: (a: ProductListItem, b: ProductListItem) => a.stock - b.stock,
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
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductListItem) => (
        <span className={styles.actionLinks}>
          <Link
            className={styles.actionLinkButton}
            onClick={() => goToBundleCreate('edit', record)}
          >
            编辑
          </Link>
          <Link
            className={styles.actionLinkButton}
            onClick={() => goToBundleCreate('copy', record)}
          >
            复制
          </Link>
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <Form className={styles.filterForm}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>套餐搜索</div>
              <Input.Group className={styles.searchGroup} compact>
                <Select
                  bordered
                  className={styles.searchTypeSelect}
                  value={formValues.searchType}
                  onChange={(value) => updateFormValue('searchType', value as ProductSearchType)}
                >
                  <Option value="productName">套餐名称</Option>
                  <Option value="productId">套餐 ID</Option>
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
                  updateFormValue('productCatalogId', getProductCatalogIdFromPath(path, catalogItems));
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
                    ? getProductOwnershipPathById(formValues.productOwnershipId, ownershipItems)
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
                value={formValues.createdAtRange.length ? formValues.createdAtRange : undefined}
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
          <TabPane key="all" title={`全部(${queryResult.tabCounts.all})`} />
          <TabPane key="selling" title={`销售中(${queryResult.tabCounts.selling})`} />
          <TabPane key="warehouse" title={`仓库中(${queryResult.tabCounts.warehouse})`} />
        </Tabs>

        <div className={styles.toolbar}>
          <Button type="primary" onClick={() => goToBundleCreate('create')}>
            添加套餐
          </Button>
          <Button
            disabled={!selectedRowKeys.length}
            onClick={() => handleBatchStatusChange('on')}
          >
            {currentStoreId ? '批量设为可售' : '批量上架'}
          </Button>
          <Button
            disabled={!selectedRowKeys.length}
            onClick={() => handleBatchStatusChange('off')}
          >
            {currentStoreId ? '批量设为不可售' : '批量下架'}
          </Button>
        </div>

        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            columns={columns}
            data={queryResult.items}
            noDataElement="暂无套餐"
            pagination={false}
            rowSelection={{
              selectedRowKeys,
              columnWidth: 48,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            scroll={{ x: 1850 }}
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
    </div>
  );
}

export default ProductBundlePage;
