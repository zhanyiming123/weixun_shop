import React from 'react';
import { Modal, Tag } from '@arco-design/web-react';
import {
  OrganizationItem,
  ORGANIZATION_STATUS_LABEL_MAP,
} from '@/pages/enterprise/organization/data';
import styles from './store-detail-modal.module.less';

type MerchantStoreDetailModalProps = {
  visible: boolean;
  organization?: OrganizationItem | null;
  onCancel: () => void;
};

function MerchantStoreDetailModal({
  visible,
  organization,
  onCancel,
}: MerchantStoreDetailModalProps) {
  return (
    <Modal
      title="店铺详情"
      visible={visible}
      footer={null}
      style={{ width: 720 }}
      onCancel={onCancel}
    >
      {organization && (
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>店铺状态</span>
            <span className={styles.detailValue}>
              <Tag color={organization.status === 'enabled' ? 'green' : undefined}>
                {ORGANIZATION_STATUS_LABEL_MAP[organization.status]}
              </Tag>
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>店铺名称</span>
            <span className={styles.detailValue}>{organization.name || '-'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>店铺编号</span>
            <span className={styles.detailValue}>{organization.code || '-'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>联系电话</span>
            <span className={styles.detailValue}>
              {organization.contactPhone || '-'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>负责人姓名</span>
            <span className={styles.detailValue}>
              {organization.managerName || '-'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>负责人电话</span>
            <span className={styles.detailValue}>
              {organization.managerPhone || '-'}
            </span>
          </div>
          <div className={styles.detailItemFull}>
            <span className={styles.detailLabel}>联系地址</span>
            <span className={styles.detailValue}>{organization.address || '-'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>创建时间</span>
            <span className={styles.detailValue}>{organization.createdAt}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>更新时间</span>
            <span className={styles.detailValue}>{organization.updatedAt}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default MerchantStoreDetailModal;
