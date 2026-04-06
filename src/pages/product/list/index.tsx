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
  Select,
  Switch,
  Table,
  Tabs,
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
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
  DEFAULT_FILTER_VALUES,
  MOCK_PRODUCTS,
  ProductFilterValues,
  ProductItem,
  ProductSearchType,
  ProductStatus,
} from './data';

type ProductTab = 'all' | 'selling' | 'warehouse';
type ProductCreateActionMode = 'edit' | 'copy';

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
  const [products, setProducts] = useState<ProductItem[]>(MOCK_PRODUCTS);
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

  const filteredProducts = useMemo(
    () => applyFilters(products, appliedFilters),
    [products, appliedFilters]
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

  useEffect(() => {
    const visibleKeys = new Set(tableData.map((item) => item.id));
    setSelectedRowKeys((prev) =>
      prev.filter((key) => visibleKeys.has(String(key)))
    );
  }, [tableData]);

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
      title: '商品归属',
      dataIndex: 'productOwnershipId',
      width: 260,
      render: (value: string) => getProductOwnershipFullLabel(value, ownershipItems),
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
      width: 120,
      sorter: (a: ProductItem, b: ProductItem) => a.stock - b.stock,
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
              <div className={styles.filterLabel}>商品归属</div>
              <Cascader
                allowClear
                className={styles.catalogCascader}
                options={productOwnershipOptions}
                placeholder="请选择商品归属"
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
            scroll={{ x: 1700 }}
            tableLayoutFixed
          />
        </div>
      </Card>
    </div>
  );
}

export default ProductListPage;
