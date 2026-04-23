import React from 'react';
import { Card, Typography } from '@arco-design/web-react';
import { IconTag } from '@arco-design/web-react/icon';
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
          <Card
            bordered={false}
            hoverable
            className={styles.moduleCard}
            onClick={() => history.push('/marketing/center/coupon/list')}
          >
            <div className={styles.moduleCardInner}>
              <div className={styles.moduleIcon}>
                <IconTag />
              </div>
              <div className={styles.moduleContent}>
                <div className={styles.moduleTitle}>优惠券</div>
                <div className={styles.moduleDesc}>通用券（满减、直减、折扣）</div>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}

export default MarketingCenterPage;
