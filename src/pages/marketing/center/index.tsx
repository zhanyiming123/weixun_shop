import React from 'react';
import { Card, Typography } from '@arco-design/web-react';
import { IconTags } from '@arco-design/web-react/icon';
import { useHistory } from 'react-router-dom';
import styles from './index.module.less';

function MarketingCenterPage() {
  const history = useHistory();

  return (
    <div className={styles.page}>
      <Typography.Title className={styles.pageTitle} heading={4}>
        营销中心
      </Typography.Title>

      <Card className={styles.boardCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={5}>
            营销玩法
          </Typography.Title>
          <Typography.Paragraph className={styles.sectionDesc} type="secondary">
            促销、多种营销、提高下单转化率
          </Typography.Paragraph>
        </div>

        <div className={styles.moduleGrid}>
          <button
            type="button"
            className={styles.moduleCard}
            onClick={() => history.push('/marketing/center/coupon/list')}
          >
            <div className={styles.moduleIcon}>
              <IconTags />
            </div>
            <div className={styles.moduleContent}>
              <div className={styles.moduleTitle}>优惠券</div>
              <div className={styles.moduleDesc}>可选满减券、直减券、折扣券等</div>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}

export default MarketingCenterPage;
