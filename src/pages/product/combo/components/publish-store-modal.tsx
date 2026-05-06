import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Pagination,
  Radio,
  Select,
  Table,
  Typography,
} from '@arco-design/web-react';
import { IconRefresh, IconSearch } from '@arco-design/web-react/icon';
import styles from './publish-store-modal.module.less';
import { resolveSourceStoreMetaById } from '@/lib/product';
import type { OrganizationItem } from '@/pages/enterprise/organization/data';
import {
  buildProductStoreDepartmentOptions,
  maskPhone,
  ProductStoreItem,
} from '@/pages/product/store-config/data';
import type {
  ProductStoreSellStatus,
  PublishProductTargetMode,
} from '@/types/product';

type PublishStoreModalSubmitPayload = {
  sellStatus: ProductStoreSellStatus;
  channelStatus: 'on' | 'off';
  targetMode: PublishProductTargetMode;
  targetStoreIds: string[];
};

type PublishStoreModalProps = {
  visible: boolean;
  productCount: number;
  storeItems: ProductStoreItem[];
  organizationItems: OrganizationItem[];
  onCancel: () => void;
  onSubmit: (payload: PublishStoreModalSubmitPayload) => Promise<void>;
};

type PublishStoreRowItem = ProductStoreItem & {
  storeGroupName: string;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

function normalizeSelectedStoreIds(selectedStoreIds: string[], allStoreIds: string[]) {
  const selectedSet = new Set(
    selectedStoreIds.filter((item) => allStoreIds.includes(item))
  );

  return allStoreIds.filter((item) => selectedSet.has(item));
}

function PublishStoreModal({
  visible,
  productCount,
  storeItems,
  organizationItems,
  onCancel,
  onSubmit,
}: PublishStoreModalProps) {
  const [sellStatusDraft, setSellStatusDraft] =
    useState<ProductStoreSellStatus>('sellable');
  const [selectorMode, setSelectorMode] =
    useState<PublishProductTargetMode>('specific');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [storeGroupFilter, setStoreGroupFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [submitting, setSubmitting] = useState(false);

  const storeRows = useMemo<PublishStoreRowItem[]>(() => {
    return storeItems.map((item) => {
      const sourceMeta = resolveSourceStoreMetaById(item.id, storeItems, organizationItems);
      return {
        ...item,
        storeGroupName:
          sourceMeta.sourceRegionName || item.departmentName || '未分组',
      };
    });
  }, [organizationItems, storeItems]);
  const allStoreIds = useMemo(() => storeRows.map((item) => item.id), [storeRows]);
  const departmentOptions = useMemo(
    () => buildProductStoreDepartmentOptions(storeItems),
    [storeItems]
  );
  const storeGroupOptions = useMemo(() => {
    const seen = new Set<string>();

    return storeRows.reduce<Array<{ label: string; value: string }>>((result, item) => {
      if (!item.storeGroupName || seen.has(item.storeGroupName)) {
        return result;
      }

      seen.add(item.storeGroupName);
      result.push({
        label: item.storeGroupName,
        value: item.storeGroupName,
      });
      return result;
    }, []);
  }, [storeRows]);
  const filteredStoreRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return storeRows.filter((item) => {
      if (departmentFilter !== 'all' && item.departmentId !== departmentFilter) {
        return false;
      }

      if (storeGroupFilter !== 'all' && item.storeGroupName !== storeGroupFilter) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const searchTarget = [
        item.name,
        item.managerName,
        item.phone,
        item.address,
        item.departmentName,
        item.storeGroupName,
      ]
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(normalizedKeyword);
    });
  }, [departmentFilter, keyword, storeGroupFilter, storeRows]);
  const currentPageRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStoreRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredStoreRows, pageSize]);
  const currentPageStoreIds = useMemo(
    () => currentPageRows.map((item) => item.id),
    [currentPageRows]
  );
  const normalizedSelectedStoreIds = useMemo(
    () => normalizeSelectedStoreIds(selectedStoreIds, allStoreIds),
    [allStoreIds, selectedStoreIds]
  );
  const effectiveTargetStoreIds =
    selectorMode === 'all' ? allStoreIds : normalizedSelectedStoreIds;
  const isCurrentPageAllSelected =
    currentPageStoreIds.length > 0 &&
    currentPageStoreIds.every((item) => normalizedSelectedStoreIds.includes(item));
  const isCurrentPagePartiallySelected =
    !isCurrentPageAllSelected &&
    currentPageStoreIds.some((item) => normalizedSelectedStoreIds.includes(item));

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSellStatusDraft('sellable');
    setSelectorMode('specific');
    setSelectedStoreIds([]);
    setDepartmentFilter('all');
    setStoreGroupFilter('all');
    setKeyword('');
    setCurrentPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSubmitting(false);
  }, [visible]);

  useEffect(() => {
    setSelectedStoreIds((previous) => normalizeSelectedStoreIds(previous, allStoreIds));
  }, [allStoreIds]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredStoreRows.length / pageSize));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredStoreRows.length, pageSize]);

  function handleSellStatusChange(value: string) {
    setSellStatusDraft(value as ProductStoreSellStatus);
  }

  function handleSelectorModeChange(value: string) {
    const nextMode = value as PublishProductTargetMode;
    setSelectorMode(nextMode);
    setCurrentPage(1);

    if (nextMode === 'all') {
      setSelectedStoreIds([]);
    }
  }

  function resetFilters() {
    setDepartmentFilter('all');
    setStoreGroupFilter('all');
    setKeyword('');
    setCurrentPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  }

  function handleCurrentPageSelectionChange(checked: boolean) {
    const pageStoreIdSet = new Set(currentPageStoreIds);

    if (checked) {
      setSelectedStoreIds((previous) =>
        Array.from(new Set([...previous, ...currentPageStoreIds]))
      );
      return;
    }

    setSelectedStoreIds((previous) =>
      previous.filter((item) => !pageStoreIdSet.has(item))
    );
  }

  async function handleSubmit() {
    if (!effectiveTargetStoreIds.length) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        sellStatus: sellStatusDraft,
        channelStatus: sellStatusDraft === 'sellable' ? 'on' : 'off',
        targetMode: selectorMode,
        targetStoreIds: effectiveTargetStoreIds,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      width: 260,
    },
    {
      title: '店铺分组',
      dataIndex: 'storeGroupName',
      width: 180,
    },
    {
      title: '经营地址',
      dataIndex: 'address',
      width: 360,
    },
    {
      title: '店长/联系方式',
      dataIndex: 'managerName',
      width: 220,
      render: (_: string, record: PublishStoreRowItem) => (
        <div className={styles.contactCell}>
          <span>{record.managerName}</span>
          <span>{`+86-${maskPhone(record.phone)}`}</span>
        </div>
      ),
    },
  ];

  return (
    <Modal
      className={styles.publishModal}
      title="发布到店铺"
      visible={visible}
      autoFocus={false}
      focusLock
      style={{ width: 1280, maxWidth: 'calc(100vw - 32px)' }}
      footer={
        <div className={styles.modalFooter}>
          <Typography.Text className={styles.footerSummary}>
            {selectorMode === 'all'
              ? `当前将发布到 ${allStoreIds.length} 家店铺`
              : `已选店铺：(${normalizedSelectedStoreIds.length})`}
          </Typography.Text>
          <div className={styles.footerActions}>
            <Button onClick={onCancel}>取消</Button>
            <Button
              type="primary"
              disabled={!effectiveTargetStoreIds.length}
              loading={submitting}
              onClick={handleSubmit}
            >
              确定
            </Button>
          </div>
        </div>
      }
      onCancel={onCancel}
    >
      <div className={styles.modalContent}>
        <div className={styles.summaryCard}>
          <Typography.Text className={styles.summaryText}>
            当前将对已勾选的 {productCount} 个商品批量设置店铺可售状态。
          </Typography.Text>
        </div>

        <div className={styles.optionPanel}>
          <div className={styles.optionRow}>
            <div className={styles.optionLabel}>设置可售：</div>
            <Radio.Group value={sellStatusDraft} onChange={handleSellStatusChange}>
              <Radio value="sellable">可售</Radio>
              <Radio value="unsellable">不可售</Radio>
            </Radio.Group>
          </div>

          <div className={styles.optionRow}>
            <div className={styles.optionLabel}>选择店铺：</div>
            <Radio.Group value={selectorMode} onChange={handleSelectorModeChange}>
              <Radio value="all">全部店铺</Radio>
              <Radio value="specific">指定店铺</Radio>
            </Radio.Group>
          </div>
        </div>

        {selectorMode === 'all' ? (
          <div className={styles.allStoreHint}>
            <Typography.Text>
              将对当前组织可见范围内的全部 {allStoreIds.length} 家店铺生效。
            </Typography.Text>
          </div>
        ) : (
          <>
            <div className={styles.filterRow}>
              <Button icon={<IconRefresh />} onClick={resetFilters}>
                刷新
              </Button>

              <Select
                className={styles.filterSelect}
                value={departmentFilter}
                onChange={(value) => {
                  setDepartmentFilter(value);
                  setCurrentPage(1);
                }}
              >
                <Select.Option value="all">全部部门</Select.Option>
                {departmentOptions.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>

              <Select
                className={styles.filterSelect}
                value={storeGroupFilter}
                onChange={(value) => {
                  setStoreGroupFilter(value);
                  setCurrentPage(1);
                }}
              >
                <Select.Option value="all">全部店铺分组</Select.Option>
                {storeGroupOptions.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>

              <Input
                allowClear
                className={styles.searchInput}
                placeholder="店长/联系方式/店铺名称"
                prefix={<IconSearch />}
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className={styles.tableWrap}>
              <Table
                rowKey="id"
                className={styles.table}
                columns={columns}
                data={currentPageRows}
                noDataElement="暂无店铺数据"
                pagination={false}
                rowSelection={{
                  type: 'checkbox',
                  columnWidth: 48,
                  preserveSelectedRowKeys: true,
                  selectedRowKeys: normalizedSelectedStoreIds,
                  onChange: (keys) =>
                    setSelectedStoreIds(keys.map((item) => String(item))),
                }}
                scroll={{ x: 1020, y: 420 }}
                tableLayoutFixed
              />
            </div>

            <div className={styles.tableToolbar}>
              <Checkbox
                checked={isCurrentPageAllSelected}
                indeterminate={isCurrentPagePartiallySelected}
                disabled={!currentPageStoreIds.length}
                onChange={handleCurrentPageSelectionChange}
              >
                当前页全选
              </Checkbox>

              <Pagination
                className={styles.pagination}
                current={currentPage}
                pageSize={pageSize}
                showJumper
                showTotal={(total) => `共 ${total} 条`}
                sizeCanChange
                sizeOptions={PAGE_SIZE_OPTIONS}
                total={filteredStoreRows.length}
                onChange={(pageNumber, nextPageSize) => {
                  setCurrentPage(nextPageSize === pageSize ? pageNumber : 1);
                  setPageSize(nextPageSize);
                }}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default PublishStoreModal;
export type { PublishStoreModalSubmitPayload };
