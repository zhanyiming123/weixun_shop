import React from 'react';
import { useSelector } from 'react-redux';
import StarterPage from '@/components/StarterPage';
import { GlobalState } from '@/store';
import { getOrganizationScopeLabel } from '@/utils/organization';
import { scaleMetricByDemoScope } from '@/utils/demo';

function AfterSalesListPage() {
  const { currentOrganization, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const scopeLabel = getOrganizationScopeLabel(
    currentOrganization?.scope || 'headquarter'
  );
  const scopeName = currentOrganization?.name || '总部';
  const processingCount = scaleMetricByDemoScope(18, demoContext);
  const todayResolvedCount = scaleMetricByDemoScope(27, demoContext);
  const escalatedCount = scaleMetricByDemoScope(4, demoContext);

  return (
    <StarterPage
      title="售后列表"
      badge={demoContext?.systemLabel || '售后管理'}
      description={`当前处于${scopeLabel}视角（${scopeName}），售后列表会按${demoContext?.dataScopeLabel || '当前权限'}口径投影处理中的工单数量，用来演示不同身份的数据差异。`}
      summaries={[
        {
          label: '当前视角',
          value: scopeName,
          helper: `已按${scopeLabel}范围切换菜单与数据视角。`,
        },
        {
          label: '处理中工单',
          value: `${processingCount} 单`,
          helper: '店铺员工看到的是本部门范围内的售后工单。',
        },
        {
          label: '今日结案',
          value: `${todayResolvedCount} 单`,
          helper: '适合演示售后效率在不同管理视角下的差异。',
        },
        {
          label: '升级处理',
          value: `${escalatedCount} 单`,
          helper: '用于展示需要商户侧或区域侧介入的异常售后。',
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
