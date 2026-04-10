export type EmployeeStatus = 'enabled' | 'unopened';

export type EmployeeFilterValues = {
  keyword: string;
  organizationId?: string;
  status?: EmployeeStatus;
};

export type EmployeeOrganizationOption = {
  label: string;
  value: string;
};

export type EmployeeItem = {
  id: string;
  account: string;
  name: string;
  contactPhone: string;
  organizationId: string;
  organizationDisplay: string[];
  operator: string;
  operatedAt: string;
  status: EmployeeStatus;
  isCurrentAccount: boolean;
};

export const DEFAULT_EMPLOYEE_FILTER_VALUES: EmployeeFilterValues = {
  keyword: '',
  organizationId: undefined,
  status: undefined,
};

export const EMPLOYEE_STATUS_FILTER_LABEL_MAP: Record<EmployeeStatus, string> = {
  enabled: '已启用',
  unopened: '未开通',
};

export const EMPLOYEE_STATUS_TABLE_LABEL_MAP: Record<EmployeeStatus, string> = {
  enabled: '已启用',
  unopened: '—',
};

export const EMPLOYEE_ORGANIZATION_OPTIONS: EmployeeOrganizationOption[] = [
  {
    label: '唯寻线上商城',
    value: 'store-online',
  },
  {
    label: '华南区',
    value: 'south-region',
  },
  {
    label: '唯寻教育科技',
    value: 'education-tech',
  },
];

export const DEFAULT_EMPLOYEE_ITEMS: EmployeeItem[] = [
  {
    id: 'employee_1',
    account: '+86-13693049483',
    name: '殷旭鹏',
    contactPhone: '13693049483',
    organizationId: 'store-online',
    organizationDisplay: ['唯寻线上商城/-/新建/编辑商品权限'],
    operator: '155******27',
    operatedAt: '2026-04-07 17:30:38',
    status: 'unopened',
    isCurrentAccount: false,
  },
  {
    id: 'employee_2',
    account: '+86-18086661212',
    name: '卓文韬',
    contactPhone: '+86-18086661212',
    organizationId: 'south-region',
    organizationDisplay: ['华南区/-/高级管理员'],
    operator: '—',
    operatedAt: '2026-04-02 18:52:06',
    status: 'unopened',
    isCurrentAccount: false,
  },
  {
    id: 'employee_3',
    account: '+86-17621434475',
    name: '朱国乐',
    contactPhone: '17621434475',
    organizationId: 'store-online',
    organizationDisplay: ['唯寻线上商城/-/运营'],
    operator: '155******27',
    operatedAt: '2026-04-02 18:45:20',
    status: 'unopened',
    isCurrentAccount: false,
  },
  {
    id: 'employee_4',
    account: '+86-15522371827',
    name: '展一鸣',
    contactPhone: '+86-15522371827',
    organizationId: 'education-tech',
    organizationDisplay: [
      '唯寻教育科技.../-/高级管理员',
      '华南区/-/高级管理员',
      '...',
    ],
    operator: '—',
    operatedAt: '2026-04-02 17:00:58',
    status: 'enabled',
    isCurrentAccount: true,
  },
];
