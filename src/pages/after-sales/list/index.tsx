import React from 'react';
import { Card, Empty, Typography } from '@arco-design/web-react';

function AfterSalesListPage() {
  return (
    <Card>
      <Typography.Title heading={4}>售后列表</Typography.Title>
      <Empty description="售后列表页面占位中，暂未配置数据展示内容。" />
    </Card>
  );
}

export default AfterSalesListPage;
