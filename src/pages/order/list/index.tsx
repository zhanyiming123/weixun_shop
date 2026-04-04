import React from 'react';
import StarterPage from '@/components/StarterPage';

function OrderListPage() {
  return (
    <StarterPage
      title="订单列表"
      badge="订单管理"
      description="这里作为订单管理下的订单列表页占位，后续可以继续承接订单检索、订单详情、发货处理和履约追踪。"
      summaries={[
        {
          label: '页面类型',
          value: '交易列表',
          helper: '适合做多条件检索、状态切换和详情查看。',
        },
        {
          label: '覆盖流程',
          value: '下单到签收',
          helper: '串联支付、发货、物流、签收和完结状态。',
        },
        {
          label: '推荐起步',
          value: '状态筛选',
          helper: '建议先补齐订单号、用户、支付状态和发货状态筛选。',
        },
      ]}
      modules={[
        '订单号、买家、时间范围检索',
        '支付、发货、完成等状态筛选',
        '订单表格与详情抽屉',
        '发货、备注和导出入口',
      ]}
      nextSteps={[
        '补充订单详情时间轴',
        '接入物流轨迹与运单同步',
        '支持批量发货和面单打印',
        '联动退款和售后处理动作',
      ]}
    />
  );
}

export default OrderListPage;
