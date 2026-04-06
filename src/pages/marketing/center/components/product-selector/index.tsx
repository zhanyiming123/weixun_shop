import React, { useEffect, useMemo, useState } from 'react';
import {
  Cascader,
  Checkbox,
  Input,
  Modal,
  Radio,
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
  const [filters, setFilters] = useState<MarketingProductSelectorFilterValues>(
    DEFAULT_FILTER_VALUES
  );
  const [draftSelectedSkuIds, setDraftSelectedSkuIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setActiveTab(readonly ? 'selected' : 'all');
    setFilters(DEFAULT_FILTER_VALUES);
    setDraftSelectedSkuIds(selectedSkuIds.filter((key) => allSkuKeys.has(key)));
  }, [allSkuKeys, readonly, selectedSkuIds, visible]);

  const selectedData = useMemo(
    () => filterTreeBySelected(data, draftSelectedSkuIds),
    [data, draftSelectedSkuIds]
  );
  const filteredAllData = useMemo(
    () => filterTreeByConditions(data, filters),
    [data, filters]
  );
  const filteredSelectedData = useMemo(
    () => filterTreeByConditions(selectedData, filters),
    [filters, selectedData]
  );
  const tableData = activeTab === 'all' ? filteredAllData : filteredSelectedData;
  const allTabCount = countVisibleSku(filteredAllData);
  const selectedTabCount = countVisibleSku(filteredSelectedData);

  function patchFilters(
    patch: Partial<MarketingProductSelectorFilterValues>
  ) {
    setFilters((previous) => ({
      ...previous,
      ...patch,
    }));
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
      title: '商品名称',
      dataIndex: 'productName',
      width: 300,
      ellipsis: true,
      render: (_: string, record: MarketingProductSelectorTableItem) => (
        <div className={styles.nameCell}>
          <span className={styles.namePrimary}>{record.productName}</span>
          <span className={styles.nameMeta}>
            商品 ID：{record.productId}
            {record.rowType === 'sku' ? ` / SKU ID：${record.skuId}` : ''}
          </span>
        </div>
      ),
    },
    {
      title: '规格',
      dataIndex: 'specText',
      width: 180,
      render: (value: string, record: MarketingProductSelectorTableItem) =>
        record.rowType === 'sku' ? (
          value || <span className={styles.emptyCell}>-</span>
        ) : (
          <span className={styles.emptyCell}>-</span>
        ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 140,
      render: (value: number, record: MarketingProductSelectorTableItem) =>
        record.rowType === 'sku' ? (
          formatCurrency(value)
        ) : (
          <span className={styles.emptyCell}>-</span>
        ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 120,
      render: (value: number, record: MarketingProductSelectorTableItem) =>
        record.rowType === 'sku' ? (
          value
        ) : (
          <span className={styles.emptyCell}>-</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: ProductStatus, record: MarketingProductSelectorTableItem) =>
        record.rowType === 'sku' ? (
          <Tag color={value === 'on' ? 'green' : 'red'}>
            {value === 'on' ? '上架' : '下架'}
          </Tag>
        ) : (
          <span className={styles.emptyCell}>-</span>
        ),
    },
    {
      title: '不可选原因',
      dataIndex: 'disabledReason',
      width: 200,
      render: (value: string) =>
        value ? (
          <span className={styles.disabledReason}>{value}</span>
        ) : (
          <span className={styles.emptyCell}>-</span>
        ),
    },
  ];

  return (
    <Modal
      title={title}
      visible={visible}
      footer={readonly ? null : undefined}
      okText="确定"
      cancelText="取消"
      style={{ width: 1180 }}
      onCancel={onCancel}
      onOk={() => onConfirm?.(draftSelectedSkuIds)}
    >
      <div className={styles.modalBody}>
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>商品搜索</span>
              <Input
                allowClear
                className={styles.keywordInput}
                placeholder="请输入商品名称 / 商品 ID"
                value={filters.keyword}
                onChange={(value) => patchFilters({ keyword: value })}
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
                  filters.productCatalogId
                    ? getProductCatalogPathById(filters.productCatalogId, catalogItems)
                    : undefined
                }
                onChange={(value) => {
                  const path = normalizePath(value);
                  patchFilters({
                    productCatalogId: getProductCatalogIdFromPath(path, catalogItems),
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
                  filters.productOwnershipId
                    ? getProductOwnershipPathById(
                        filters.productOwnershipId,
                        ownershipItems
                      )
                    : undefined
                }
                onChange={(value) => {
                  const path = normalizePath(value);
                  patchFilters({
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
              <Radio.Group
                className={styles.statusGroup}
                value={filters.status || 'all'}
                onChange={(value) =>
                  patchFilters({
                    status: value === 'all' ? undefined : (value as ProductStatus),
                  })
                }
              >
                <Radio value="all">全部</Radio>
                <Radio value="on">上架</Radio>
                <Radio value="off">下架</Radio>
              </Radio.Group>
            </div>
          </div>
        </div>

        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          destroyOnHide={false}
          onChange={(key) => setActiveTab(key as MarketingProductSelectorTab)}
        >
          <TabPane key="all" title={`全部商品(${allTabCount})`} />
          <TabPane key="selected" title={`已选商品(${selectedTabCount})`} />
        </Tabs>

        <div className={styles.tableWrapper}>
          <Table
            rowKey="key"
            columns={columns}
            data={tableData}
            defaultExpandAllRows
            noDataElement={
              activeTab === 'selected' ? '暂无已选商品' : '暂无可选商品'
            }
            pagination={{
              pageSize: 6,
              sizeCanChange: false,
            }}
            rowSelection={
              readonly
                ? undefined
                : {
                    checkAll: false,
                    checkStrictly: true,
                    columnWidth: 48,
                    preserveSelectedRowKeys: true,
                    selectedRowKeys: draftSelectedSkuIds,
                    checkboxProps: (record) =>
                      record.rowType === 'spu'
                        ? { disabled: true }
                        : { disabled: !record.selectable },
                    renderCell: (
                      originNode: React.ReactNode,
                      _: boolean,
                      record: MarketingProductSelectorTableItem
                    ) =>
                      record.rowType === 'spu' ? (
                        <Checkbox
                          className={styles.parentCheckbox}
                          checked={isSpuChecked(record)}
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
            scroll={{ x: 1080 }}
            tableLayoutFixed
          />
        </div>

        {!readonly && (
          <Typography.Text type="secondary">
            已选择 {draftSelectedSkuIds.length} 个 SKU
          </Typography.Text>
        )}
      </div>
    </Modal>
  );
}
