import React, { useMemo } from 'react';
import { Modal, Table, Typography } from '@arco-design/web-react';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import type { ProductItem } from '@/types/product';
import { buildProductSalesStoreRows } from './sales-store-detail';

type SalesStoreDetailModalProps = {
  product: ProductItem | null;
  visible: boolean;
  onCancel: () => void;
};

export default function SalesStoreDetailModal({
  product,
  visible,
  onCancel,
}: SalesStoreDetailModalProps) {
  const storeItems = useMemo(() => readProductStoreItems(), []);
  const rows = useMemo(
    () => (product ? buildProductSalesStoreRows(product, storeItems) : []),
    [product, storeItems]
  );

  return (
    <Modal
      title="在售店铺详情"
      visible={visible}
      autoFocus={false}
      focusLock
      footer={null}
      style={{ width: 960 }}
      onCancel={onCancel}
    >
      <Typography.Paragraph>
        当前共 {rows.length} 家在售店铺
      </Typography.Paragraph>
      <Table
        rowKey="key"
        columns={[
          {
            title: '在售店铺',
            dataIndex: 'storeName',
            width: 260,
          },
          {
            title: '在售 SKU',
            dataIndex: 'skuNamesText',
            width: 340,
          },
          {
            title: '上架中的 SKU',
            dataIndex: 'skuNamesText',
            width: 320,
          },
        ]}
        data={rows}
        noDataElement="暂无在售店铺"
        pagination={false}
        tableLayoutFixed
      />
    </Modal>
  );
}
