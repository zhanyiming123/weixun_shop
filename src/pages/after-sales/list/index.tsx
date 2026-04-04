import React from 'react';
import StarterPage from '@/components/StarterPage';

function AfterSalesListPage() {
  return (
    <StarterPage
      title="售后列表"
      badge="售后管理"
      description="这里作为售后管理下的售后列表页占位，后续可以承接退款、退货退款、换货申请和售后处理记录。"
      summaries={[
        {
          label: '页面类型',
          value: '服务工单',
          helper: '适合统一管理售后申请、审核节点和处理记录。',
        },
        {
          label: '核心动作',
          value: '审核 / 退款',
          helper: '覆盖通过、拒绝、备注和退款执行等关键动作。',
        },
        {
          label: '推荐起步',
          value: '售后状态',
          helper: '建议先补齐申请类型、处理状态、订单号和申请时间筛选。',
        },
      ]}
      modules={[
        '售后单号、订单号与类型筛选',
        '退款审核和售后状态流转',
        '售后详情与处理记录',
        '凭证查看与备注能力',
      ]}
      nextSteps={[
        '接入退款执行结果回传',
        '补充退货物流与入库确认',
        '沉淀售后原因分析报表',
        '增加客服协同和责任归类',
      ]}
    />
  );
}

export default AfterSalesListPage;
