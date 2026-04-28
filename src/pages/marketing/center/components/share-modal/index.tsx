import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Modal,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconShareAlt } from '@arco-design/web-react/icon';
import {
  readProductStoreItems,
} from '@/pages/product/store-config/data';

type ShareModalProps = {
  visible: boolean;
  // 券名称（展示在标题中）
  couponName: string;
  // 创建者店铺 ID（排除自身）
  ownershipStoreId: string;
  // 已分享的店铺列表（展示为「已分享」状态，禁止重复选择）
  alreadySharedStoreIds: string[];
  // 可分享的店铺范围（undefined = 不限制，取全量店铺）
  allowedStoreIds?: string[];
  onCancel: () => void;
  onConfirm: (targetStoreIds: string[]) => void;
};

function ShareModal({
  visible,
  couponName,
  ownershipStoreId,
  alreadySharedStoreIds,
  allowedStoreIds,
  onCancel,
  onConfirm,
}: ShareModalProps) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  const allStores = useMemo(() => readProductStoreItems(), []);

  // 可选店铺：排除创建者自身，按 allowedStoreIds 过滤
  const availableStores = useMemo(() => {
    const allowedSet = allowedStoreIds ? new Set(allowedStoreIds) : null;
    return allStores.filter((store) => {
      if (store.id === ownershipStoreId) return false;
      if (allowedSet && !allowedSet.has(store.id)) return false;
      return true;
    });
  }, [allStores, ownershipStoreId, allowedStoreIds]);

  const alreadySharedSet = useMemo(
    () => new Set(alreadySharedStoreIds),
    [alreadySharedStoreIds]
  );

  const selectedSet = new Set(selectedStoreIds);

  useEffect(() => {
    if (visible) {
      setSelectedStoreIds([]);
    }
  }, [visible]);

  function handleToggle(storeId: string, checked: boolean) {
    setSelectedStoreIds((prev) =>
      checked ? [...prev, storeId] : prev.filter((id) => id !== storeId)
    );
  }

  const storeNameMap = useMemo(
    () => new Map(allStores.map((s) => [s.id, s.name])),
    [allStores]
  );

  return (
    <Modal
      visible={visible}
      title={
        <Space>
          <IconShareAlt />
          <span>分享优惠券</span>
        </Space>
      }
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            disabled={selectedStoreIds.length === 0}
            onClick={() => onConfirm(selectedStoreIds)}
          >
            确认分享
          </Button>
        </Space>
      }
      unmountOnExit
    >
      <div style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">优惠券：</Typography.Text>
        <Typography.Text bold>{couponName}</Typography.Text>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          分享后目标店铺立即可见此券，且无法修改券内容。
          {alreadySharedStoreIds.length > 0 &&
            `当前已分享至 ${alreadySharedStoreIds.length} 家店铺。`}
        </Typography.Text>
      </div>

      {availableStores.length === 0 ? (
        <Typography.Text type="secondary">暂无可分享的店铺</Typography.Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {availableStores.map((store) => {
            const isAlreadyShared = alreadySharedSet.has(store.id);
            const isChecked = isAlreadyShared || selectedSet.has(store.id);

            return (
              <div
                key={store.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: isChecked
                    ? 'var(--color-primary-light-1)'
                    : 'var(--color-fill-2)',
                  border: isChecked
                    ? '1px solid var(--color-primary-light-3)'
                    : '1px solid transparent',
                  cursor: isAlreadyShared ? 'not-allowed' : 'pointer',
                  opacity: isAlreadyShared ? 0.75 : 1,
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  if (!isAlreadyShared) {
                    handleToggle(store.id, !selectedSet.has(store.id));
                  }
                }}
              >
                <Space>
                  <Checkbox
                    disabled={isAlreadyShared}
                    checked={isChecked}
                    onChange={(checked) => handleToggle(store.id, checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Typography.Text>{store.name}</Typography.Text>
                  {isAlreadyShared && (
                    <Tag color="arcoblue" size="small">
                      已分享
                    </Tag>
                  )}
                </Space>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12 }}
                >
                  {store.address}
                </Typography.Text>
              </div>
            );
          })}
        </div>
      )}

      {selectedStoreIds.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            本次新增分享 {selectedStoreIds.length} 家店铺：
            {selectedStoreIds
              .map((id) => storeNameMap.get(id) || id)
              .join('、')}
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}

export default ShareModal;
