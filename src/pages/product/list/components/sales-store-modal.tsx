import React, { useMemo, useState } from 'react';
import { Modal } from '@arco-design/web-react';
import SalesStoreConfigPanel from './sales-store-config-panel';
import type { ProductStoreItem } from '@/pages/product/store-config/data';
import type {
  ProductListItem,
  ProductStoreChannelProductPoolStoreConfigItem,
} from '@/types/product';

type SalesStoreModalProps = {
  visible: boolean;
  product: ProductListItem | null;
  storeItems: ProductStoreItem[];
  title?: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (
    productPoolStoreConfigs: ProductStoreChannelProductPoolStoreConfigItem[]
  ) => Promise<void> | void;
};

function SalesStoreModal({
  visible,
  product,
  storeItems,
  title = '管理在售门店',
  submitting = false,
  onCancel,
  onSubmit,
}: SalesStoreModalProps) {
  const [draftConfigs, setDraftConfigs] = useState<
    ProductStoreChannelProductPoolStoreConfigItem[]
  >([]);
  const modalKey = useMemo(
    () => `${product?.id || 'empty'}-${visible ? 'open' : 'closed'}`,
    [product?.id, visible]
  );

  return (
    <Modal
      key={modalKey}
      title={title}
      visible={visible}
      autoFocus={false}
      focusLock
      style={{ width: 1280 }}
      confirmLoading={submitting}
      onOk={() => onSubmit(draftConfigs)}
      onCancel={onCancel}
    >
      <SalesStoreConfigPanel
        product={product}
        storeItems={storeItems}
        onChange={setDraftConfigs}
      />
    </Modal>
  );
}

export default SalesStoreModal;
