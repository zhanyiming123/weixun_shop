import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Cascader,
  Checkbox,
  Drawer,
  Input,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import styles from './index.module.less';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import { ProductStatus } from '@/pages/product/list/data';
import {
  MarketingProductSelectorFilterValues,
  MarketingProductSelectorSpuItem,
  MarketingProductSelectorTab,
  MarketingProductSelectorTableItem,
} from './types';

const TabPane = Tabs.TabPane;
const Option = Select.Option;

type MarketingProductSelectorProps = {
  visible: boolean;
  title: string;
  readonly?: boolean;
  selectedSkuIds: string[];
  data: MarketingProductSelectorSpuItem[];
  onCancel: () => void;
  onConfirm?: (selectedSkuIds: string[]) => void;
};

const DEFAULT_FILTER_VALUES: MarketingProductSelectorFilterValues = {
  keyword: '',
  productCatalogId: undefined,
  productOwnershipId: undefined,
  status: undefined,
};
const TABLE_PAGE_SIZE = 10;
export const PRODUCT_STATUS_OPTIONS: Array<{
  label: string;
  value: 'all' | ProductStatus;
}> = [
  { label: '全部', value: 'all' },
  { label: '已上架', value: 'on' },
  { label: '已下架', value: 'off' },
];

export function getProductStatusLabel(status: ProductStatus) {
  return status === 'on' ? '已上架' : '已下架';
}

function getProductStatusColor(status: ProductStatus) {
  return status === 'on' ? 'green' : 'arcoblue';
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

function formatCurrency(price: number) {
  return `¥${price.toFixed(2)}`;
}

function formatPriceRange(prices: number[]) {
  if (!prices.length) {
    return '-';
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return minPrice === maxPrice
    ? formatCurrency(minPrice)
    : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
}

function filterTreeBySelected(
  data: MarketingProductSelectorSpuItem[],
  selectedSkuIds: string[]
) {
  if (!selectedSkuIds.length) {
    return [];
  }

  const selectedSet = new Set(selectedSkuIds);
  return data
    .map((spu) => {
      const children = spu.children.filter((item) => selectedSet.has(item.key));
      if (!children.length) {
        return null;
      }

      const hasSelectableSku = children.some((item) => item.selectable);
      return {
        ...spu,
        selectable: hasSelectableSku,
        disabledReason: hasSelectableSku ? '' : '该商品下无可选 SKU',
        children,
      };
    })
    .filter(Boolean) as MarketingProductSelectorSpuItem[];
}

function filterTreeByConditions(
  data: MarketingProductSelectorSpuItem[],
  filters: MarketingProductSelectorFilterValues
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return data
    .map((spu) => {
      if (
        filters.productCatalogId &&
        spu.productCatalogId !== filters.productCatalogId
      ) {
        return null;
      }

      if (
        filters.productOwnershipId &&
        spu.productOwnershipId !== filters.productOwnershipId
      ) {
        return null;
      }

      if (keyword) {
        const matchedByKeyword =
          spu.productName.toLowerCase().includes(keyword) ||
          spu.productId.toLowerCase().includes(keyword);
        if (!matchedByKeyword) {
          return null;
        }
      }

      const children = filters.status
        ? spu.children.filter((item) => item.status === filters.status)
        : spu.children;

      if (!children.length) {
        return null;
      }

      const hasSelectableSku = children.some((item) => item.selectable);

      return {
        ...spu,
        selectable: hasSelectableSku,
        disabledReason: hasSelectableSku ? '' : '该商品下无可选 SKU',
        children,
      };
    })
    .filter(Boolean) as MarketingProductSelectorSpuItem[];
}

function countVisibleSku(data: MarketingProductSelectorSpuItem[]) {
  return data.reduce((count, item) => count + item.children.length, 0);
}

export default function MarketingProductSelector({
  visible,
  title,
  readonly = false,
  selectedSkuIds,
  data,
  onCancel,
  onConfirm,
}: MarketingProductSelectorProps) {
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
  const allSkuKeys = useMemo(
    () => new Set(data.flatMap((item) => item.children.map((child) => child.key))),
    [data]
  );
  const [activeTab, setActiveTab] = useState<MarketingProductSelectorTab>(
    readonly ? 'selected' : 'all'
  );
  const [filterFormValues, setFilterFormValues] = useState<MarketingProductSelectorFilterValues>(
    DEFAULT_FILTER_VALUES
  );
  const [appliedFilters, setAppliedFilters] = useState<MarketingProductSelectorFilterValues>(
    DEFAULT_FILTER_VALUES
  );
  const [draftSelectedSkuIds, setDraftSelectedSkuIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setActiveTab(readonly ? 'selected' : 'all');
    setFilterFormValues(DEFAULT_FILTER_VALUES);
    setAppliedFilters(DEFAULT_FILTER_VALUES);
    setCurrentPage(1);
    setDraftSelectedSkuIds(selectedSkuIds.filter((key) => allSkuKeys.has(key)));
  }, [allSkuKeys, readonly, selectedSkuIds, visible]);

  const selectedData = useMemo(
    () => filterTreeBySelected(data, draftSelectedSkuIds),
    [data, draftSelectedSkuIds]
  );
  const filteredAllData = useMemo(
    () => filterTreeByConditions(data, appliedFilters),
    [appliedFilters, data]
  );
  const tableData = activeTab === 'all' ? filteredAllData : selectedData;
  const allTabCount = countVisibleSku(filteredAllData);
  const selectedTabCount = countVisibleSku(selectedData);
  const isReadonlySelectedView = readonly;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableData.length / TABLE_PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, tableData.length]);

  function patchFilterFormValues(
    patch: Partial<MarketingProductSelectorFilterValues>
  ) {
    setFilterFormValues((previous) => ({
      ...previous,
      ...patch,
    }));
  }

  function handleQuery() {
    setAppliedFilters({ ...filterFormValues });
    setCurrentPage(1);
  }

  function handleReset() {
    setFilterFormValues(DEFAULT_FILTER_VALUES);
    setAppliedFilters(DEFAULT_FILTER_VALUES);
    setCurrentPage(1);
  }

  function getSelectableChildKeys(record: MarketingProductSelectorSpuItem) {
    return record.children
      .filter((item) => item.selectable)
      .map((item) => item.key);
  }

  function isSpuChecked(record: MarketingProductSelectorSpuItem) {
    const childKeys = getSelectableChildKeys(record);
    if (!childKeys.length) {
      return false;
    }

    return childKeys.every((key) => draftSelectedSkuIds.includes(key));
  }

  function isSpuIndeterminate(record: MarketingProductSelectorSpuItem) {
    const childKeys = getSelectableChildKeys(record);
    if (!childKeys.length) {
      return false;
    }

    const selectedCount = childKeys.filter((key) =>
      draftSelectedSkuIds.includes(key)
    ).length;
    return selectedCount > 0 && selectedCount < childKeys.length;
  }

  function handleSpuCheck(record: MarketingProductSelectorSpuItem, checked: boolean) {
    const childKeys = getSelectableChildKeys(record);
    if (!childKeys.length) {
      return;
    }

    setDraftSelectedSkuIds((previous) => {
      if (checked) {
        return Array.from(new Set([...previous, ...childKeys]));
      }

      const childKeySet = new Set(childKeys);
      return previous.filter((key) => !childKeySet.has(key));
    });
  }

  const columns = [
    {
      title: '',
      dataIndex: 'expandControl',
      width: 44,
      className: styles.expandControlColumn,
      render: () => null,
    },
    {
      title: '商品信息',
      dataIndex: 'productInfo',
      width: 520,
      render: (_: string, record: MarketingProductSelectorTableItem) => (
        <div
          className={[
            styles.productInfoCell,
            record.rowType === 'sku' ? styles.childProductInfoCell : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.productInfoContent}>
            <div className={styles.productTitleRow}>
              <Tag
                bordered={false}
                className={styles.statusTag}
                color={getProductStatusColor(record.status)}
                size="small"
              >
                {getProductStatusLabel(record.status)}
              </Tag>
              <div className={styles.productNameText}>{record.productName}</div>
            </div>
            <div className={styles.productMetaText}>
              {record.rowType === 'spu'
                ? `商品编码：${record.productId}`
                : `SKU编码：${record.skuId}`}
            </div>
            <div className={styles.productMetaText}>{record.specSummary}</div>
          </div>
        </div>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 180,
      render: (value: number, record: MarketingProductSelectorTableItem) =>
        record.rowType === 'spu'
          ? formatPriceRange(record.children.map((item) => item.price))
          : formatCurrency(value),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 120,
      render: (value: number) => value,
    },
  ];

  return (
    <Drawer
      className={styles.selectorDrawer}
      placement="right"
      title={title}
      visible={visible}
      footer={readonly ? null : undefined}
      okText="确定"
      cancelText="取消"
      width="min(1280px, calc(100vw - 32px))"
      onCancel={onCancel}
      onOk={() => onConfirm?.(draftSelectedSkuIds)}
    >
      <div className={styles.modalBody}>
        {!isReadonlySelectedView ? (
          <Tabs
            activeTab={activeTab}
            className={styles.tabs}
            destroyOnHide={false}
            onChange={(key) => {
              setActiveTab(key as MarketingProductSelectorTab);
              setCurrentPage(1);
            }}
          >
            <TabPane key="all" title={`全部商品(${allTabCount})`} />
            <TabPane key="selected" title={`已选商品(${selectedTabCount})`} />
          </Tabs>
        ) : (
          <div className={styles.readonlyHeader}>
            <Typography.Text className={styles.readonlyTitle}>
              已选商品
            </Typography.Text>
            <Typography.Text type="secondary">
              共 {selectedTabCount} 个 SKU，仅支持查看
            </Typography.Text>
          </div>
        )}

        {!isReadonlySelectedView && activeTab === 'all' && (
          <div className={styles.filterPanel}>
            <div className={styles.filterGrid}>
              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>商品搜索</span>
                <Input
                  allowClear
                  className={styles.keywordInput}
                  placeholder="请输入商品名称 / 商品 ID"
                  value={filterFormValues.keyword}
                  onChange={(value) => patchFilterFormValues({ keyword: value })}
                  onPressEnter={handleQuery}
                />
              </div>

              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>商品类目</span>
                <Cascader
                  allowClear
                  className={styles.cascaderControl}
                  options={productCatalogOptions}
                  placeholder="请选择商品类目"
                  value={
                    filterFormValues.productCatalogId
                      ? getProductCatalogPathById(
                          filterFormValues.productCatalogId,
                          catalogItems
                        )
                      : undefined
                  }
                  onChange={(value) => {
                    const path = normalizePath(value);
                    patchFilterFormValues({
                      productCatalogId: getProductCatalogIdFromPath(
                        path,
                        catalogItems
                      ),
                    });
                  }}
                />
              </div>

              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>商品分类</span>
                <Cascader
                  allowClear
                  className={styles.cascaderControl}
                  options={productOwnershipOptions}
                  placeholder="请选择商品分类"
                  value={
                    filterFormValues.productOwnershipId
                      ? getProductOwnershipPathById(
                          filterFormValues.productOwnershipId,
                          ownershipItems
                        )
                      : undefined
                  }
                  onChange={(value) => {
                    const path = normalizePath(value);
                    patchFilterFormValues({
                      productOwnershipId: getProductOwnershipIdFromPath(
                        path,
                        ownershipItems
                      ),
                    });
                  }}
                />
              </div>

              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>商品状态</span>
                <Select
                  className={styles.cascaderControl}
                  placeholder="请选择商品状态"
                  value={filterFormValues.status || 'all'}
                  onChange={(value) =>
                    patchFilterFormValues({
                      status:
                        value === 'all'
                          ? undefined
                          : (value as ProductStatus | undefined),
                    })
                  }
                >
                  {PRODUCT_STATUS_OPTIONS.map((item) => (
                    <Option key={item.label} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            <div className={styles.filterActions}>
              <Button type="primary" onClick={handleQuery}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </div>
          </div>
        )}

        <div className={styles.tablePanel}>
          <div className={styles.tableWrapper}>
            <Table
              className={styles.treeTable}
              rowKey="key"
              columns={columns}
              data={tableData}
              indentSize={0}
              noDataElement={activeTab === 'selected' ? '暂无已选商品' : '暂无可选商品'}
              expandProps={{
                strictTreeData: false,
              }}
              pagination={{
                current: currentPage,
                pageSize: TABLE_PAGE_SIZE,
                total: tableData.length,
                sizeCanChange: false,
                showTotal: true,
                showJumper: true,
                onChange: (pageNumber) => setCurrentPage(pageNumber),
              }}
              rowSelection={
                readonly
                  ? undefined
                  : {
                      type: 'checkbox',
                      checkStrictly: true,
                      columnWidth: 48,
                      preserveSelectedRowKeys: true,
                      selectedRowKeys: draftSelectedSkuIds,
                      checkboxProps: (record) =>
                        record.rowType === 'spu'
                          ? { disabled: !record.selectable }
                          : { disabled: !record.selectable },
                      renderCell: (
                        originNode: React.ReactNode,
                        _: boolean,
                        record: MarketingProductSelectorTableItem
                      ) =>
                        record.rowType === 'spu' ? (
                          <Checkbox
                            checked={isSpuChecked(record)}
                            className={styles.parentCheckbox}
                            disabled={!record.selectable}
                            indeterminate={isSpuIndeterminate(record)}
                            onChange={(checked) => handleSpuCheck(record, checked)}
                          />
                        ) : (
                          originNode
                        ),
                      onChange: (keys) =>
                        setDraftSelectedSkuIds(
                          keys
                            .map((key) => String(key))
                            .filter((key) => allSkuKeys.has(key))
                        ),
                    }
              }
              scroll={{ x: 880 }}
              tableLayoutFixed
            />
          </div>
        </div>

        {!readonly && (
          <Typography.Text className={styles.selectionSummary} type="secondary">
            已选择 {draftSelectedSkuIds.length} 个 SKU
          </Typography.Text>
        )}
      </div>
    </Drawer>
  );
}
