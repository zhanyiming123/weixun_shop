import Mock from 'mockjs';
import setupMock from '@/utils/setupMock';
import { HeadquartersDashboardData, HeadquartersDashboardStore } from '../types';

type StoreSeed = HeadquartersDashboardStore & {
  regionId: string;
};

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function buildRecentTrend(totalGmv: number) {
  const today = new Date();
  const ratioSeed = [
    0.028, 0.027, 0.029, 0.03, 0.031, 0.033, 0.034, 0.032, 0.031, 0.03,
    0.029, 0.03, 0.031, 0.032, 0.034, 0.036, 0.037, 0.036, 0.035, 0.034,
    0.033, 0.032, 0.031, 0.03, 0.031, 0.032, 0.034, 0.036, 0.037, 0.039,
  ];
  const ratioSum = ratioSeed.reduce((sum, value) => sum + value, 0);
  const trend = ratioSeed.map((ratio, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (ratioSeed.length - 1 - index));

    const rawValue = Math.round((totalGmv * ratio) / ratioSum);

    return {
      date: formatDate(date),
      value: rawValue,
    };
  });

  const diff =
    totalGmv - trend.reduce((sum, item) => sum + item.value, 0);

  if (diff && trend.length) {
    trend[trend.length - 1].value += diff;
  }

  return trend;
}

function buildDashboardData(): HeadquartersDashboardData {
  const stores: StoreSeed[] = [
    {
      id: 'store_shanghai',
      name: '上海门店',
      regionId: 'region_east',
      regionName: '华东区',
      managerName: '王璇',
      gmv: 458200,
      orderCount: 1240,
      customerCount: 910,
      averageOrderValue: 369.52,
      warningTags: ['库存紧张', '售后偏高'],
    },
    {
      id: 'store_beijing',
      name: '北京门店',
      regionId: 'region_north',
      regionName: '华北区',
      managerName: '李航',
      gmv: 312600,
      orderCount: 860,
      customerCount: 640,
      averageOrderValue: 363.49,
      warningTags: ['转化偏低'],
    },
    {
      id: 'store_hangzhou',
      name: '杭州门店',
      regionId: 'region_east',
      regionName: '华东区',
      managerName: '周宁',
      gmv: 274900,
      orderCount: 780,
      customerCount: 590,
      averageOrderValue: 352.44,
      warningTags: ['缺货预警', '人效待提升'],
    },
  ];

  const totalGmv = stores.reduce((sum, item) => sum + item.gmv, 0);
  const totalOrders = stores.reduce((sum, item) => sum + item.orderCount, 0);
  const totalCustomers = stores.reduce((sum, item) => sum + item.customerCount, 0);

  const regions = [
    {
      id: 'region_east',
      name: '华东区',
    },
    {
      id: 'region_north',
      name: '华北区',
    },
  ].map((region) => {
    const matchedStores = stores.filter((item) => item.regionId === region.id);
    return {
      id: region.id,
      name: region.name,
      storeCount: matchedStores.length,
      gmv: matchedStores.reduce((sum, item) => sum + item.gmv, 0),
      orderCount: matchedStores.reduce((sum, item) => sum + item.orderCount, 0),
      customerCount: matchedStores.reduce(
        (sum, item) => sum + item.customerCount,
        0
      ),
      warningCount: matchedStores.reduce(
        (sum, item) => sum + item.warningTags.length,
        0
      ),
    };
  });

  const now = new Date();

  return {
    updatedAt: formatDateTime(now),
    summary: {
      gmv: {
        value: totalGmv,
        trendValue: '12.6%',
        trendDirection: 'up',
      },
      orderCount: {
        value: totalOrders,
        trendValue: '8.4%',
        trendDirection: 'up',
      },
      customerCount: {
        value: totalCustomers,
        trendValue: '6.9%',
        trendDirection: 'up',
      },
      averageOrderValue: {
        value: Number((totalGmv / totalOrders).toFixed(2)),
        trendValue: '3.8%',
        trendDirection: 'up',
      },
    },
    gmvTrend: buildRecentTrend(totalGmv),
    regions,
    stores: stores.map(({ regionId, ...store }) => store),
    alerts: [
      {
        id: 'alert_1',
        level: 'high',
        title: '库存周转低于安全阈值',
        targetName: '上海门店',
        description: '重点课程套餐库存低于 7 天安全库存，建议今日完成补货。',
      },
      {
        id: 'alert_2',
        level: 'high',
        title: '售后工单连续上升',
        targetName: '华东区',
        description: '近 3 天售后工单增长 18%，需复盘交付与客服处理质量。',
      },
      {
        id: 'alert_3',
        level: 'medium',
        title: '转化率低于总部基准',
        targetName: '北京门店',
        description: '门店转化率较总部均值低 2.6 个百分点，需要跟进销售脚本。',
      },
      {
        id: 'alert_4',
        level: 'medium',
        title: '人效表现波动',
        targetName: '杭州门店',
        description: '本周门店人效连续两日下降，建议排查排班与到店转化。',
      },
      {
        id: 'alert_5',
        level: 'low',
        title: '区域经营简报待确认',
        targetName: '华北区',
        description: '本周区域复盘简报尚未确认，建议在例会前完成校对。',
      },
    ],
    todos: [
      {
        id: 'todo_1',
        title: '确认华东区补货计划',
        owner: '总部商品运营',
        dueText: '今日 14:00 前',
        status: '今日截止',
      },
      {
        id: 'todo_2',
        title: '跟进北京门店转化提升方案',
        owner: '总部销售运营',
        dueText: '今日 16:30 前',
        status: '待处理',
      },
      {
        id: 'todo_3',
        title: '复盘近 7 天售后异常工单',
        owner: '总部客服负责人',
        dueText: '今日 18:00 前',
        status: '进行中',
      },
    ],
  };
}

setupMock({
  setup: () => {
    Mock.mock(new RegExp('/api/workplace/headquarters-dashboard'), () =>
      buildDashboardData()
    );
  },
});
