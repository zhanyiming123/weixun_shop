export type HeadquartersDashboardTrendDirection = 'up' | 'down' | 'flat';

export type HeadquartersDashboardMetric = {
  value: number;
  trendValue: string;
  trendDirection: HeadquartersDashboardTrendDirection;
};

export type HeadquartersDashboardSummary = {
  gmv: HeadquartersDashboardMetric;
  orderCount: HeadquartersDashboardMetric;
  customerCount: HeadquartersDashboardMetric;
  averageOrderValue: HeadquartersDashboardMetric;
};

export type HeadquartersDashboardTrendPoint = {
  date: string;
  value: number;
};

export type HeadquartersDashboardRegion = {
  id: string;
  name: string;
  storeCount: number;
  gmv: number;
  orderCount: number;
  customerCount: number;
  warningCount: number;
};

export type HeadquartersDashboardStore = {
  id: string;
  name: string;
  regionName: string;
  managerName: string;
  gmv: number;
  orderCount: number;
  customerCount: number;
  averageOrderValue: number;
  warningTags: string[];
};

export type HeadquartersDashboardAlertLevel = 'high' | 'medium' | 'low';

export type HeadquartersDashboardAlert = {
  id: string;
  level: HeadquartersDashboardAlertLevel;
  title: string;
  targetName: string;
  description: string;
};

export type HeadquartersDashboardTodo = {
  id: string;
  title: string;
  owner: string;
  dueText: string;
  status: string;
};

export type HeadquartersDashboardData = {
  updatedAt: string;
  summary: HeadquartersDashboardSummary;
  gmvTrend: HeadquartersDashboardTrendPoint[];
  regions: HeadquartersDashboardRegion[];
  stores: HeadquartersDashboardStore[];
  alerts: HeadquartersDashboardAlert[];
  todos: HeadquartersDashboardTodo[];
};
