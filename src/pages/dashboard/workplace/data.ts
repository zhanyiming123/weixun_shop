import { CurrentOrganization } from '@/utils/organization';
import { HeadquartersDashboardData, HeadquartersDashboardStore } from './types';

type StoreSeed = HeadquartersDashboardStore & {
  regionId: string;
};

const STORE_SEEDS: StoreSeed[] = [
  {
    id: 'store_suzhou',
    name: '苏州门店',
    regionId: 'region_direct',
    regionName: '总部直属门店',
    managerName: '陈晨',
    gmv: 328600,
    orderCount: 920,
    customerCount: 708,
    averageOrderValue: 357.17,
    warningTags: ['到店转化待提升'],
  },
  {
    id: 'store_guangzhou',
    name: '广州门店',
    regionId: 'region_south',
    regionName: '唯寻华南',
    managerName: '黄颖',
    gmv: 458200,
    orderCount: 1240,
    customerCount: 910,
    averageOrderValue: 369.52,
    warningTags: ['库存紧张', '售后偏高'],
  },
  {
    id: 'store_shenzhen',
    name: '深圳门店',
    regionId: 'region_south',
    regionName: '唯寻华南',
    managerName: '赵琪',
    gmv: 312600,
    orderCount: 860,
    customerCount: 640,
    averageOrderValue: 363.49,
    warningTags: ['新客转化待提升'],
  },
];

const ALERT_SEEDS = [
  {
    id: 'alert_1',
    level: 'high' as const,
    title: '库存周转低于安全阈值',
    targetName: '广州门店',
    description: '重点课程套餐库存低于 7 天安全库存，建议今日完成补货。',
  },
  {
    id: 'alert_2',
    level: 'high' as const,
    title: '售后工单连续上升',
    targetName: '唯寻华南',
    description: '近 3 天售后工单增长 18%，需复盘交付与客服处理质量。',
  },
  {
    id: 'alert_3',
    level: 'medium' as const,
    title: '转化率低于总部基准',
    targetName: '深圳门店',
    description: '门店转化率较总部均值低 2.6 个百分点，需要跟进销售脚本。',
  },
  {
    id: 'alert_4',
    level: 'medium' as const,
    title: '人效表现波动',
    targetName: '苏州门店',
    description: '本周门店人效连续两日下降，建议排查排班与到店转化。',
  },
  {
    id: 'alert_5',
    level: 'low' as const,
    title: '区域经营简报待确认',
    targetName: '唯寻华南',
    description: '本周区域复盘简报尚未确认，建议在例会前完成校对。',
  },
  {
    id: 'alert_6',
    level: 'medium' as const,
    title: '直属门店到店转化波动',
    targetName: '苏州门店',
    description: '近 3 日到店转化率低于阶段目标，建议复盘预约到访与接待流程。',
  },
];

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

    return {
      date: formatDate(date),
      value: Math.round((totalGmv * ratio) / ratioSum),
    };
  });

  const diff = totalGmv - trend.reduce((sum, item) => sum + item.value, 0);
  if (diff && trend.length) {
    trend[trend.length - 1].value += diff;
  }

  return trend;
}

function getVisibleStores(currentOrganization?: CurrentOrganization) {
  if (!currentOrganization || currentOrganization.scope === 'headquarter') {
    return STORE_SEEDS;
  }

  const visibleStoreIdSet = new Set(currentOrganization.storeIds);
  return STORE_SEEDS.filter((item) => visibleStoreIdSet.has(item.id));
}

function buildRegions(stores: StoreSeed[]) {
  return Array.from(
    stores.reduce((result, item) => {
      const current = result.get(item.regionId) || {
        id: item.regionId,
        name: item.regionName,
        storeCount: 0,
        gmv: 0,
        orderCount: 0,
        customerCount: 0,
        warningCount: 0,
      };

      current.storeCount += 1;
      current.gmv += item.gmv;
      current.orderCount += item.orderCount;
      current.customerCount += item.customerCount;
      current.warningCount += item.warningTags.length;
      result.set(item.regionId, current);
      return result;
    }, new Map<string, HeadquartersDashboardData['regions'][number]>())
  ).map(([, value]) => value);
}

function buildTodos(
  currentOrganization: CurrentOrganization | undefined,
  stores: StoreSeed[],
  regions: HeadquartersDashboardData['regions']
) {
  if (!stores.length) {
    return [];
  }

  if (currentOrganization?.scope === 'store') {
    const currentStore = stores[0];
    return [
      {
        id: 'todo_store_1',
        title: '核对今日到店转化与成交数据',
        owner: `${currentStore.name}店长`,
        dueText: '今日 14:00 前',
        status: '待处理',
      },
      {
        id: 'todo_store_2',
        title: '跟进库存预警商品补货安排',
        owner: `${currentStore.name}运营`,
        dueText: '今日 16:00 前',
        status: '进行中',
      },
      {
        id: 'todo_store_3',
        title: '复盘近 3 日售后异常工单',
        owner: `${currentStore.name}客服负责人`,
        dueText: '今日 18:00 前',
        status: '今日截止',
      },
    ];
  }

  if (currentOrganization?.scope === 'region') {
    const currentRegionName = regions[0]?.name || currentOrganization.name;
    return [
      {
        id: 'todo_region_1',
        title: `确认${currentRegionName}重点门店补货计划`,
        owner: `${currentRegionName}商品运营`,
        dueText: '今日 14:00 前',
        status: '待处理',
      },
      {
        id: 'todo_region_2',
        title: `跟进${currentRegionName}转化提升方案`,
        owner: `${currentRegionName}销售运营`,
        dueText: '今日 16:30 前',
        status: '进行中',
      },
      {
        id: 'todo_region_3',
        title: `汇总${currentRegionName}售后异常复盘`,
        owner: `${currentRegionName}客服负责人`,
        dueText: '今日 18:00 前',
        status: '今日截止',
      },
    ];
  }

  return [
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
  ];
}

function buildAlerts(
  currentOrganization: CurrentOrganization | undefined,
  stores: StoreSeed[],
  regions: HeadquartersDashboardData['regions']
) {
  if (!stores.length) {
    return [];
  }

  if (!currentOrganization || currentOrganization.scope === 'headquarter') {
    return ALERT_SEEDS;
  }

  const visibleStoreNameSet = new Set(stores.map((item) => item.name));
  const visibleRegionNameSet = new Set(regions.map((item) => item.name));

  return ALERT_SEEDS.filter(
    (item) =>
      visibleStoreNameSet.has(item.targetName) ||
      (currentOrganization.scope !== 'store' &&
        visibleRegionNameSet.has(item.targetName))
  );
}

export function buildWorkplaceDashboardData(
  currentOrganization?: CurrentOrganization
): HeadquartersDashboardData {
  const stores = getVisibleStores(currentOrganization);
  const totalGmv = stores.reduce((sum, item) => sum + item.gmv, 0);
  const totalOrders = stores.reduce((sum, item) => sum + item.orderCount, 0);
  const totalCustomers = stores.reduce((sum, item) => sum + item.customerCount, 0);
  const regions = buildRegions(stores);
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
        value: totalOrders ? Number((totalGmv / totalOrders).toFixed(2)) : 0,
        trendValue: '3.8%',
        trendDirection: 'up',
      },
    },
    gmvTrend: buildRecentTrend(totalGmv),
    regions,
    stores: stores.map(({ regionId, ...item }) => item),
    alerts: buildAlerts(currentOrganization, stores, regions),
    todos: buildTodos(currentOrganization, stores, regions),
  };
}
