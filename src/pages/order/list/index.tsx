import React from 'react';
import { Card, Empty, Typography } from '@arco-design/web-react';

function OrderListPage() {
  return (
    <Card>
      <Typography.Title heading={4}>订单列表</Typography.Title>
      <Empty description="订单列表页面占位中，暂未配置数据展示内容。" />
    </Card>
  );
}

export default OrderListPage;
