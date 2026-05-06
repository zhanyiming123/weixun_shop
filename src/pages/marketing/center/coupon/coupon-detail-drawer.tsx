import React from 'react';
import { Drawer } from '@arco-design/web-react';
import { CouponFormPage } from './create';
import styles from './coupon-detail-drawer.module.less';

type CouponDetailDrawerProps = {
  couponId: string | null;
  visible: boolean;
  onCancel: () => void;
};

export default function CouponDetailDrawer({
  couponId,
  visible,
  onCancel,
}: CouponDetailDrawerProps) {
  return (
    <Drawer
      className={styles.detailDrawer}
      placement="right"
      title="优惠券详情"
      visible={visible}
      footer={null}
      width="min(1120px, calc(100vw - 32px))"
      onCancel={onCancel}
    >
      {couponId && (
        <CouponFormPage
          mode="detail"
          couponId={couponId}
          embedded
          onClose={onCancel}
        />
      )}
    </Drawer>
  );
}
