import React from 'react';
import { useSelector } from 'react-redux';
import StarterPage from '@/components/StarterPage';
import { GlobalState } from '@/store';
import { getOrganizationScopeLabel } from '@/utils/organization';
import { scaleMetricByDemoScope } from '@/utils/demo';

function OrderListPage() {
  const { currentOrganization, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const scopeLabel = getOrganizationScopeLabel(
    currentOrganization?.scope || 'headquarter'
  );
  const scopeName = currentOrganization?.name || '总部';
  const pendingCount = scaleMetricByDemoScope(36, demoContext);
  const todayCount = scaleMetricByDemoScope(128, demoContext);
  const refundRiskCount = scaleMetricByDemoScope(9, demoContext);

  return (
    <StarterPage
      title="订单列表"
      badge={demoContext?.systemLabel || '订单管理'}
      description={`当前处于${scopeLabel}视角（${scopeName}），订单列表会继续叠加${demoContext?.dataScopeLabel || '当前权限'}口径，用来演示不同身份看到的交易数据范围。`}
      summaries={[
        {
          label: '当前视角',
          value: scopeName,
          helper: `已按${scopeLabel}范围切换菜单与数据视角。`,
        },
        {
          label: '今日订单',
          value: `${todayCount} 单`,
          helper: '切换演示身份后，这里的数量会随数据权限口径一起变化。',
        },
        {
          label: '待跟进订单',
          value: `${pendingCount} 单`,
          helper: '用于演示店铺员工仅看到部门内需要处理的订单。',
        },
        {
          label: '退款风险',
          value: `${refundRiskCount} 单`,
          helper: '可作为商户侧与店铺侧差异化看板的占位指标。',
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
