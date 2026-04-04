import React from 'react';
import StarterPage from '@/components/StarterPage';

function MarketingCenterPage() {
  return (
    <StarterPage
      title="营销中心"
      badge="营销管理"
      description="这里作为营销管理下的营销中心页占位，后续可以接优惠券、满减活动、限时促销和营销效果分析。"
      summaries={[
        {
          label: '页面类型',
          value: '活动中心',
          helper: '适合统一收口各类活动入口和运营看板。',
        },
        {
          label: '核心玩法',
          value: '优惠 / 促销',
          helper: '覆盖优惠券、满减、折扣、组合购等常见营销能力。',
        },
        {
          label: '推荐起步',
          value: '优惠券模块',
          helper: '建议先补齐优惠券模板、发放记录和活动状态管理。',
        },
      ]}
      modules={[
        '活动列表与状态切换',
        '优惠券模板和领取记录',
        '满减、折扣和活动规则配置',
        '营销效果与转化数据看板',
      ]}
      nextSteps={[
        '支持活动商品圈选',
        '联动会员等级与权益体系',
        '接入消息通知和活动提醒',
        '沉淀活动 ROI 分析模型',
      ]}
    />
  );
}

export default MarketingCenterPage;
