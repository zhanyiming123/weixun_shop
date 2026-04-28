import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Table, Tag, Typography } from '@arco-design/web-react';
import type { ProductStoreItem } from '@/pages/product/store-config/data';
import styles from './share-target-selector.module.less';

type ShareTargetSelectorProps = {
  value: string[];
  options: ProductStoreItem[];
  disabled?: boolean;
  title?: string;
  onChange: (value: string[]) => void;
};

const PAGE_SIZE = 8;

function normalizeIds(ids: string[] = [], options: ProductStoreItem[] = []) {
  const availableIdSet = new Set(options.map((item) => item.id));
  return Array.from(new Set(ids.filter((item) => availableIdSet.has(item))));
}

function ShareTargetSelector({
  value,
  options,
  disabled = false,
  title = '选择共享目标店铺',
  onChange,
}: ShareTargetSelectorProps) {
  const [visible, setVisible] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const normalizedValue = useMemo(
    () => normalizeIds(value, options),
    [options, value]
  );
  const selectedStoreMap = useMemo(
    () => new Map(options.map((item) => [item.id, item])),
    [options]
  );
  const filteredStores = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return options;
    }

    return options.filter((item) => {
      const searchTarget = [
        item.name,
        item.departmentName,
        item.address,
        item.managerName,
      ]
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(normalizedKeyword);
    });
  }, [keyword, options]);
  const tableData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStores.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredStores]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedIds(normalizedValue);
    setKeyword('');
    setCurrentPage(1);
  }, [normalizedValue, visible]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredStores.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredStores.length]);

  return (
    <div className={styles.selectorWrap}>
      <div className={styles.selectorHead}>
        <Typography.Text className={styles.selectorSummary}>
          已选择 {normalizedValue.length} 家店铺
        </Typography.Text>
        <Button disabled={disabled} onClick={() => setVisible(true)}>
          选择店铺
        </Button>
      </div>

      {!!normalizedValue.length && (
        <div className={styles.tagList}>
          {normalizedValue.map((storeId) => (
            <Tag key={storeId} color="arcoblue">
              {selectedStoreMap.get(storeId)?.name || storeId}
            </Tag>
          ))}
        </div>
      )}

      <Modal
        title={title}
        visible={visible}
        autoFocus={false}
        focusLock
        style={{ width: 980 }}
        onCancel={() => setVisible(false)}
        onOk={() => {
          onChange(normalizeIds(selectedIds, options));
          setVisible(false);
        }}
      >
        <div className={styles.filterRow}>
          <Input
            allowClear
            className={styles.searchInput}
            placeholder="搜索店铺名称/负责人/地址"
            value={keyword}
            onChange={setKeyword}
          />
        </div>

        <Table
          rowKey="id"
          className={styles.table}
          columns={[
            {
              title: '店铺名称',
              dataIndex: 'name',
              width: 260,
            },
            {
              title: '部门',
              dataIndex: 'departmentName',
              width: 180,
            },
            {
              title: '负责人',
              dataIndex: 'managerName',
              width: 160,
            },
            {
              title: '地址',
              dataIndex: 'address',
            },
          ]}
          data={tableData}
          pagination={{
            current: currentPage,
            pageSize: PAGE_SIZE,
            total: filteredStores.length,
            showTotal: true,
            onChange: (pageNumber) => setCurrentPage(pageNumber),
          }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            preserveSelectedRowKeys: true,
            onChange: (keys) => setSelectedIds(keys.map(String)),
          }}
          tableLayoutFixed
        />
      </Modal>
    </div>
  );
}

export default ShareTargetSelector;
