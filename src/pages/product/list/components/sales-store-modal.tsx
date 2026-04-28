import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Table, Tag } from '@arco-design/web-react';
import styles from './sales-store-modal.module.less';
import {
  createDefaultProductStoreConfig,
  normalizeProductStoreConfigs,
  PRODUCT_STORE_CHANNEL_STATUS_LABEL_MAP,
  PRODUCT_STORE_SELL_STATUS_LABEL_MAP,
  PRODUCT_STORE_TYPE_LABEL_MAP,
  ProductStoreConfigItem,
  ProductStoreItem,
} from '@/pages/product/store-config/data';
import type { ProductListItem } from '@/types/product';

type StoreConfigTableItem = ProductStoreItem & ProductStoreConfigItem;

type SalesStoreModalProps = {
  visible: boolean;
  product: ProductListItem | null;
  storeItems: ProductStoreItem[];
  onCancel: () => void;
};

const STORE_CONFIG_PAGE_SIZE_OPTIONS = [20, 50];

function SalesStoreModal({
  visible,
  product,
  storeItems,
  onCancel,
}: SalesStoreModalProps) {
  const [storeConfigPage, setStoreConfigPage] = useState(1);
  const [storeConfigPageSize, setStoreConfigPageSize] = useState(20);

  const storeConfigTableData = useMemo<StoreConfigTableItem[]>(() => {
    if (!product) {
      return [];
    }

    const storeConfigMap = new Map(
      normalizeProductStoreConfigs(product.storeConfigs, storeItems).map((item) => [
        item.storeId,
        {
          ...createDefaultProductStoreConfig(item.storeId),
          ...item,
        },
      ])
    );

    return storeItems.map((item) => ({
      ...item,
      ...(storeConfigMap.get(item.id) || createDefaultProductStoreConfig(item.id)),
    }));
  }, [product, storeItems]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStoreConfigPage(1);
    setStoreConfigPageSize(20);
  }, [product?.id, visible]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(storeConfigTableData.length / storeConfigPageSize)
    );

    if (storeConfigPage > totalPages) {
      setStoreConfigPage(totalPages);
    }
  }, [storeConfigPage, storeConfigPageSize, storeConfigTableData.length]);

  const storeConfigColumns = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      width: 420,
      render: (_: string, record: StoreConfigTableItem) => (
        <div className={styles.storeCell}>
          <Tag
            className={styles.storeTag}
            color={record.type === 'store' ? 'arcoblue' : 'orangered'}
          >
            {PRODUCT_STORE_TYPE_LABEL_MAP[record.type]}
          </Tag>
          <span className={styles.storeName}>{record.name}</span>
        </div>
      ),
    },
    {
      title: '是否可售',
      dataIndex: 'sellStatus',
      width: 220,
      render: (value: StoreConfigTableItem['sellStatus']) => (
        <Tag
          className={styles.statusTag}
          color={value === 'sellable' ? 'green' : 'red'}
        >
          {PRODUCT_STORE_SELL_STATUS_LABEL_MAP[value]}
        </Tag>
      ),
    },
    {
      title: '上架状态',
      dataIndex: 'channelStatus',
      width: 220,
      render: (
        value: StoreConfigTableItem['channelStatus'],
        record: StoreConfigTableItem
      ) => {
        const displayStatus =
          record.sellStatus === 'sellable' && value === 'on' ? 'on' : 'off';

        return (
          <Tag
            className={styles.statusTag}
            color={displayStatus === 'on' ? 'green' : 'gray'}
          >
            {PRODUCT_STORE_CHANNEL_STATUS_LABEL_MAP[displayStatus]}
          </Tag>
        );
      },
    },
  ];

  return (
    <Modal
      title="销售店铺详情"
      visible={visible}
      autoFocus={false}
      focusLock
      style={{ width: 1100 }}
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.storeConfigModalContent}>
        <Table
          rowKey="id"
          className={styles.storeConfigTable}
          columns={storeConfigColumns}
          data={storeConfigTableData}
          noDataElement="暂无店铺数据"
          pagination={{
            current: storeConfigPage,
            pageSize: storeConfigPageSize,
            total: storeConfigTableData.length,
            sizeCanChange: true,
            sizeOptions: STORE_CONFIG_PAGE_SIZE_OPTIONS,
            showTotal: true,
            showJumper: true,
            onChange: (pageNumber, pageSize) => {
              setStoreConfigPage(pageNumber);
              setStoreConfigPageSize(pageSize);
            },
          }}
          scroll={{ x: 980, y: 440 }}
          tableLayoutFixed
        />
      </div>
    </Modal>
  );
}

export default SalesStoreModal;
