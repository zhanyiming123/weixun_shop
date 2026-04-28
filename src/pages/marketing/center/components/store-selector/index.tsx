import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Message,
  Modal,
  Radio,
  Select,
  Table,
  Typography,
} from '@arco-design/web-react';
import {
  IconHome,
  IconRefresh,
  IconSearch,
} from '@arco-design/web-react/icon';
import styles from './index.module.less';
import {
  buildProductStoreDepartmentOptions,
  maskPhone,
  PRODUCT_STORE_TYPE_LABEL_MAP,
  ProductStoreItem,
  ProductStoreType,
  readProductStoreItems,
} from '@/pages/product/store-config/data';

type CouponStoreSelectorProps = {
  visible: boolean;
  readonly?: boolean;
  selectedStoreIds: string[];
  allowedStoreIds?: string[];
  allowedStoreTypes?: ProductStoreType[];
  entityLabel?: string;
  title?: string;
  simple?: boolean;
  onCancel: () => void;
  onConfirm: (storeIds: string[]) => void;
};

type StoreSelectorMode = 'all' | 'specific';
type StoreSelectorFilterType = 'all' | ProductStoreType;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function normalizeSelectedStoreIds(selectedStoreIds: string[], allStoreIds: string[]) {
  const selectedSet = new Set(
    selectedStoreIds.filter((item) => allStoreIds.includes(item))
  );

  return allStoreIds.filter((item) => selectedSet.has(item));
}

function isAllStoresSelected(selectedStoreIds: string[], allStoreIds: string[]) {
  return normalizeSelectedStoreIds(selectedStoreIds, allStoreIds).length === allStoreIds.length;
}

function CouponStoreSelector({
  visible,
  readonly = false,
  selectedStoreIds,
  allowedStoreIds,
  allowedStoreTypes,
  entityLabel = '店铺',
  title = '选择店铺',
  simple = false,
  onCancel,
  onConfirm,
}: CouponStoreSelectorProps) {
  const effectiveStoreTypes = useMemo(
    () =>
      allowedStoreTypes?.length
        ? Array.from(new Set(allowedStoreTypes))
        : (['store', 'mall'] as ProductStoreType[]),
    [allowedStoreTypes]
  );
  const storeItems = useMemo(
    () => {
      const visibleStoreIdSet =
        typeof allowedStoreIds === 'undefined'
          ? null
          : new Set(allowedStoreIds);

      return readProductStoreItems().filter(
        (item) =>
          effectiveStoreTypes.includes(item.type) &&
          (!visibleStoreIdSet || visibleStoreIdSet.has(item.id))
      );
    },
    [allowedStoreIds, effectiveStoreTypes]
  );
  const allStoreIds = useMemo(() => storeItems.map((item) => item.id), [storeItems]);
  const storeDepartmentOptions = useMemo(
    () => buildProductStoreDepartmentOptions(storeItems),
    [storeItems]
  );
  const [selectorMode, setSelectorMode] = useState<StoreSelectorMode>('specific');
  const [draftSelectedStoreIds, setDraftSelectedStoreIds] = useState<string[]>([]);
  const [storeDepartmentFilter, setStoreDepartmentFilter] = useState('all');
  const [storeTypeFilter, setStoreTypeFilter] =
    useState<StoreSelectorFilterType>(
      effectiveStoreTypes.length === 1 ? effectiveStoreTypes[0] : 'all'
    );
  const [storeKeyword, setStoreKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  function resetFilters() {
    setStoreDepartmentFilter('all');
    setStoreTypeFilter(effectiveStoreTypes.length === 1 ? effectiveStoreTypes[0] : 'all');
    setStoreKeyword('');
    setCurrentPage(1);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    const normalizedSelectedStoreIds = normalizeSelectedStoreIds(
      selectedStoreIds,
      allStoreIds
    );

    setDraftSelectedStoreIds(normalizedSelectedStoreIds);
    setSelectorMode(
      normalizedSelectedStoreIds.length &&
        isAllStoresSelected(normalizedSelectedStoreIds, allStoreIds)
        ? 'all'
        : 'specific'
    );
    resetFilters();
  }, [allStoreIds, effectiveStoreTypes, selectedStoreIds, visible]);

  const tableData = useMemo(() => {
    const keyword = storeKeyword.trim().toLowerCase();

    return storeItems.filter((item) => {
      if (storeDepartmentFilter !== 'all' && item.departmentId !== storeDepartmentFilter) {
        return false;
      }

      if (storeTypeFilter !== 'all' && item.type !== storeTypeFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchFields = simple
        ? item.name.toLowerCase()
        : [
            item.name,
            item.managerName,
            item.phone,
            item.address,
            item.departmentName,
          ]
            .join(' ')
            .toLowerCase();

      return searchFields.includes(keyword);
    });
  }, [simple, storeDepartmentFilter, storeItems, storeKeyword, storeTypeFilter]);

  const effectiveSelectedStoreIds =
    selectorMode === 'all' ? allStoreIds : draftSelectedStoreIds;

  const defaultColumns = [
    {
      title: `${entityLabel}名称`,
      dataIndex: 'name',
      width: 280,
      render: (_: string, record: ProductStoreItem) => (
        <div className={styles.storeNameCell}>
          <div className={styles.storeAvatar}>
            <IconHome />
          </div>
          <button className={styles.storeNameButton} type="button">
            {record.name}
          </button>
        </div>
      ),
    },
    {
      title: `${entityLabel}分类`,
      dataIndex: 'type',
      width: 120,
      render: (value: ProductStoreType) => PRODUCT_STORE_TYPE_LABEL_MAP[value],
    },
    {
      title: '销售渠道',
      dataIndex: 'departmentName',
      width: 150,
    },
    {
      title: '地址',
      dataIndex: 'address',
      width: 280,
    },
    {
      title: '店长/联系方式',
      dataIndex: 'managerName',
      width: 220,
      render: (_: string, record: ProductStoreItem) => (
        <div className={styles.contactCell}>
          <span>{record.managerName}</span>
          <span>{`+86-${maskPhone(record.phone)}`}</span>
        </div>
      ),
    },
    {
      title: '其他',
      dataIndex: 'extra',
      width: 100,
      render: () => '-',
    },
  ];
  const simpleColumns = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      width: 260,
      render: (_: string, record: ProductStoreItem) => (
        <div className={styles.storeNameCell}>
          <div className={styles.storeAvatar}>
            <IconHome />
          </div>
          <button className={styles.storeNameButton} type="button">
            {record.name}
          </button>
        </div>
      ),
    },
    {
      title: '店铺地址',
      dataIndex: 'address',
      width: 360,
    },
    {
      title: '店铺负责人',
      dataIndex: 'managerName',
      width: 220,
      render: (_: string, record: ProductStoreItem) => (
        <div className={styles.contactCell}>
          <span>{record.managerName}</span>
          <span>{`+86-${maskPhone(record.phone)}`}</span>
        </div>
      ),
    },
  ];
  const columns = simple ? simpleColumns : defaultColumns;

  function handleModeChange(value: string) {
    const nextMode = value as StoreSelectorMode;
    setSelectorMode(nextMode);

    if (nextMode === 'all') {
      setDraftSelectedStoreIds(allStoreIds);
      return;
    }

    setDraftSelectedStoreIds((previous) => normalizeSelectedStoreIds(previous, allStoreIds));
  }

  function handleConfirm() {
    if (readonly) {
      onCancel();
      return;
    }

    const nextSelectedStoreIds =
      selectorMode === 'all'
        ? [...allStoreIds]
        : normalizeSelectedStoreIds(draftSelectedStoreIds, allStoreIds);

    if (!nextSelectedStoreIds.length) {
      Message.warning(`请至少选择 1 家${entityLabel}`);
      return;
    }

    onConfirm(nextSelectedStoreIds);
  }

  return (
    <Modal
      title={title}
      visible={visible}
      autoFocus={false}
      focusLock
      footer={null}
      style={{ width: simple ? 960 : 1280 }}
      onCancel={onCancel}
    >
      <div className={styles.modalContent}>
        <div className={styles.modeRow}>
          <Radio.Group
            disabled={readonly}
            type="button"
            value={selectorMode}
            onChange={handleModeChange}
          >
            <Radio value="all">全部{entityLabel}</Radio>
            <Radio value="specific">指定{entityLabel}</Radio>
          </Radio.Group>

          <Typography.Text className={styles.modeHint}>
            {selectorMode === 'all'
              ? `当前将覆盖全部 ${allStoreIds.length} 家${entityLabel}`
              : `已选择 ${effectiveSelectedStoreIds.length} 家${entityLabel}`}
          </Typography.Text>
        </div>

        {simple ? (
          <div className={styles.simpleFilterRow}>
            <Input
              allowClear
              className={styles.searchInput}
              placeholder="请输入店铺名称"
              prefix={<IconSearch />}
              value={storeKeyword}
              onChange={(value) => {
                setStoreKeyword(value);
                setCurrentPage(1);
              }}
            />
          </div>
        ) : (
          <div className={styles.filterRow}>
            <div className={styles.filterActions}>
              <div className={styles.filterTag}>管理{entityLabel}</div>
              <Button icon={<IconRefresh />} onClick={resetFilters}>
                刷新
              </Button>
            </div>

            <Select
              className={styles.filterSelect}
              value={storeDepartmentFilter}
              onChange={(value) => {
                setStoreDepartmentFilter(value);
                setCurrentPage(1);
              }}
            >
              <Select.Option value="all">全部部门</Select.Option>
              {storeDepartmentOptions.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>

            <Select
              className={styles.filterSelect}
              value={storeTypeFilter}
              disabled={effectiveStoreTypes.length === 1}
              onChange={(value) => {
                setStoreTypeFilter(value as StoreSelectorFilterType);
                setCurrentPage(1);
              }}
            >
              {effectiveStoreTypes.length > 1 && (
                <Select.Option value="all">全部{entityLabel}分类</Select.Option>
              )}
              {effectiveStoreTypes.includes('store') && (
                <Select.Option value="store">店铺</Select.Option>
              )}
              {effectiveStoreTypes.includes('mall') && (
                <Select.Option value="mall">商城</Select.Option>
              )}
            </Select>

            <Input
              allowClear
              className={styles.searchInput}
              placeholder={`店长/联系方式/${entityLabel}名称`}
              prefix={<IconSearch />}
              value={storeKeyword}
              onChange={(value) => {
                setStoreKeyword(value);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        <Table
          rowKey="id"
          className={styles.table}
          columns={columns}
          data={tableData}
          noDataElement={`暂无${entityLabel}数据`}
          pagination={{
            current: currentPage,
            pageSize,
            total: tableData.length,
            sizeCanChange: true,
            sizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: true,
            showJumper: true,
            onChange: (pageNumber, nextPageSize) => {
              setCurrentPage(pageNumber);
              setPageSize(nextPageSize);
            },
          }}
          rowSelection={{
            type: 'checkbox',
            columnWidth: 48,
            preserveSelectedRowKeys: true,
            selectedRowKeys: effectiveSelectedStoreIds,
            checkboxProps: () => ({
              disabled: readonly || selectorMode === 'all',
            }),
            onChange: (keys) => {
              if (readonly || selectorMode === 'all') {
                return;
              }

              setDraftSelectedStoreIds(keys.map((item) => String(item)));
            },
          }}
          scroll={{ x: simple ? 840 : 1140, y: 420 }}
          tableLayoutFixed
        />

        <div className={styles.footerActions}>
          {readonly ? (
            <Button type="primary" onClick={onCancel}>
              关闭
            </Button>
          ) : (
            <>
              <Button onClick={onCancel}>取消</Button>
              <Button type="primary" onClick={handleConfirm}>
                确定
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default CouponStoreSelector;
