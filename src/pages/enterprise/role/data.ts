import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type EnterpriseRoleScope = 'headquarter' | 'store' | 'region';
export type EnterpriseRoleDataViewScope = 'all' | 'department' | 'self';

export type EnterpriseRoleDataPermissions = {
  viewScope: EnterpriseRoleDataViewScope;
};

export type EnterpriseRolePermissionNode = {
  key: string;
  title: string;
  children?: EnterpriseRolePermissionNode[];
};

export type EnterpriseRoleItem = {
  id: string;
  scope: EnterpriseRoleScope;
  name: string;
  description: string;
  employeeCount: number;
  isDefault: boolean;
  referenceRoleId?: string;
  dataPermissions: EnterpriseRoleDataPermissions;
  functionPermissionKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type EnterpriseRolePermissionState = {
  dataPermissions: EnterpriseRoleDataPermissions;
  functionPermissionKeys: string[];
};

const STORAGE_KEY = 'enterprise-role-items-v1';

const ROLE_SCOPE_VALUES: EnterpriseRoleScope[] = ['headquarter', 'store', 'region'];

export const ENTERPRISE_ROLE_SCOPE_LABEL_MAP: Record<EnterpriseRoleScope, string> = {
  headquarter: '总部角色',
  store: '门店角色',
  region: '区域角色',
};

export const ENTERPRISE_ROLE_SCOPE_DESCRIPTION_MAP: Record<
  EnterpriseRoleScope,
  string
> = {
  headquarter: '管理总部职能部门和平台级权限配置',
  store: '管理门店日常经营和一线岗位权限配置',
  region: '管理区域巡店、督导和区域运营权限配置',
};

export const DEFAULT_ENTERPRISE_ROLE_DATA_PERMISSIONS: EnterpriseRoleDataPermissions = {
  viewScope: 'department',
};

export const ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP: Record<
  EnterpriseRoleDataViewScope,
  string
> = {
  all: '全量数据',
  department: '本部门数据',
  self: '个人数据',
};

export const ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP: Record<
  EnterpriseRoleDataViewScope,
  string
> = {
  all: '可查看当前权限范围内的全部业务数据。',
  department: '可查看当前部门下的业务数据。',
  self: '仅可查看当前账号自己产生的业务数据。',
};

export const ENTERPRISE_ROLE_DATA_VIEW_SCOPE_OPTIONS: Array<{
  label: string;
  value: EnterpriseRoleDataViewScope;
  description: string;
}> = [
  {
    label: ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP.all,
    value: 'all',
    description: ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP.all,
  },
  {
    label: ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP.department,
    value: 'department',
    description: ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP.department,
  },
  {
    label: ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP.self,
    value: 'self',
    description: ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP.self,
  },
];

export const ENTERPRISE_ROLE_PERMISSION_TREE: EnterpriseRolePermissionNode[] = [
  {
    key: 'permission.overview',
    title: '概况',
    children: [
      {
        key: 'permission.overview.workbench-data',
        title: '工作台数据概况',
      },
      {
        key: 'permission.overview.sales-target-mobile',
        title: '销售目标(移动端)',
      },
      {
        key: 'permission.overview.ai-assistant',
        title: '智能助手',
      },
    ],
  },
  {
    key: 'permission.common-functions',
    title: '常用功能',
    children: [
      {
        key: 'permission.common-functions.view-operate',
        title: '查看与操作',
      },
    ],
  },
  {
    key: 'permission.product-management',
    title: '商品管理',
    children: [
      {
        key: 'product/list',
        title: '商品列表',
      },
      {
        key: 'product/create',
        title: '添加商品',
      },
      {
        key: 'product/category',
        title: '商品分类',
      },
      {
        key: 'product/catalog',
        title: '商品类目',
      },
      {
        key: 'product/attribute',
        title: '类目属性',
      },
    ],
  },
  {
    key: 'permission.order-management',
    title: '订单管理',
    children: [
      {
        key: 'order/list',
        title: '订单列表',
      },
    ],
  },
  {
    key: 'permission.after-sales-management',
    title: '售后管理',
    children: [
      {
        key: 'after-sales/list',
        title: '售后列表',
      },
    ],
  },
  {
    key: 'permission.marketing-management',
    title: '营销管理',
    children: [
      {
        key: 'marketing/center',
        title: '营销中心',
      },
      {
        key: 'marketing/center/coupon/list',
        title: '优惠券列表',
      },
      {
        key: 'marketing/center/coupon/create',
        title: '创建优惠券',
      },
    ],
  },
  {
    key: 'permission.enterprise-management',
    title: '企业管理',
    children: [
      {
        key: 'enterprise/organization',
        title: '组织机构',
      },
      {
        key: 'enterprise/department',
        title: '部门管理',
      },
      {
        key: 'enterprise/employee',
        title: '员工管理',
      },
      {
        key: 'enterprise/role',
        title: '角色管理',
      },
    ],
  },
];

const ENTERPRISE_ROLE_PERMISSION_EXCLUDED_KEYS_BY_SCOPE: Partial<
  Record<EnterpriseRoleScope, string[]>
> = {
  store: [
    'product/category',
    'product/catalog',
    'product/attribute',
    'permission.enterprise-management',
  ],
  region: [
    'product/category',
    'product/catalog',
    'product/attribute',
    'permission.enterprise-management',
  ],
};

function collectPermissionKeys(
  nodes: EnterpriseRolePermissionNode[],
  accumulator: string[] = []
): string[] {
  nodes.forEach((node) => {
    accumulator.push(node.key);
    if (node.children?.length) {
      collectPermissionKeys(node.children, accumulator);
    }
  });

  return accumulator;
}

function collectPermissionTitleMap(
  nodes: EnterpriseRolePermissionNode[],
  accumulator: Record<string, string> = {}
): Record<string, string> {
  nodes.forEach((node) => {
    accumulator[node.key] = node.title;
    if (node.children?.length) {
      collectPermissionTitleMap(node.children, accumulator);
    }
  });

  return accumulator;
}

function findPermissionNode(
  key: string,
  nodes: EnterpriseRolePermissionNode[]
): EnterpriseRolePermissionNode | null {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }

    if (node.children?.length) {
      const matched = findPermissionNode(key, node.children);
      if (matched) {
        return matched;
      }
    }
  }

  return null;
}

function addNodeAndDescendants(
  node: EnterpriseRolePermissionNode,
  result: Set<string>
) {
  result.add(node.key);
  node.children?.forEach((child) => addNodeAndDescendants(child, result));
}

function filterPermissionTreeByScope(
  scope: EnterpriseRoleScope
): EnterpriseRolePermissionNode[] {
  const excludedKeySet = new Set(
    ENTERPRISE_ROLE_PERMISSION_EXCLUDED_KEYS_BY_SCOPE[scope] || []
  );

  function filterNodes(nodes: EnterpriseRolePermissionNode[]) {
    return nodes.reduce<EnterpriseRolePermissionNode[]>((accumulator, node) => {
      if (excludedKeySet.has(node.key)) {
        return accumulator;
      }

      const nextChildren = node.children?.length
        ? filterNodes(node.children)
        : undefined;

      if (node.children?.length && !nextChildren?.length) {
        return accumulator;
      }

      accumulator.push({
        ...node,
        ...(nextChildren ? { children: nextChildren } : {}),
      });
      return accumulator;
    }, []);
  }

  return filterNodes(ENTERPRISE_ROLE_PERMISSION_TREE);
}

const ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE: Record<
  EnterpriseRoleScope,
  EnterpriseRolePermissionNode[]
> = {
  headquarter: ENTERPRISE_ROLE_PERMISSION_TREE,
  store: filterPermissionTreeByScope('store'),
  region: filterPermissionTreeByScope('region'),
};

const ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE: Record<
  EnterpriseRoleScope,
  string[]
> = {
  headquarter: collectPermissionKeys(ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE.headquarter),
  store: collectPermissionKeys(ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE.store),
  region: collectPermissionKeys(ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE.region),
};

const ENTERPRISE_ROLE_PERMISSION_KEY_SET_BY_SCOPE: Record<
  EnterpriseRoleScope,
  Set<string>
> = {
  headquarter: new Set(ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE.headquarter),
  store: new Set(ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE.store),
  region: new Set(ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE.region),
};

const ENTERPRISE_ROLE_PERMISSION_TITLE_MAP_BY_SCOPE: Record<
  EnterpriseRoleScope,
  Record<string, string>
> = {
  headquarter: collectPermissionTitleMap(ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE.headquarter),
  store: collectPermissionTitleMap(ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE.store),
  region: collectPermissionTitleMap(ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE.region),
};

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

export function normalizeEnterpriseRoleScope(
  value: string | (string | null)[] | null | undefined
): EnterpriseRoleScope {
  if (value === 'store' || value === 'region' || value === 'headquarter') {
    return value;
  }

  return 'headquarter';
}

export function getEnterpriseRolePermissionTree(scope: EnterpriseRoleScope) {
  return ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE[scope];
}

export function getEnterpriseRolePermissionRootKeys(scope: EnterpriseRoleScope) {
  return ENTERPRISE_ROLE_PERMISSION_TREE_BY_SCOPE[scope].map((item) => item.key);
}

export function getEnterpriseRoleListPath(scope: EnterpriseRoleScope) {
  return `/enterprise/role?tab=${scope}`;
}

export function getEnterpriseRoleCreatePath(scope: EnterpriseRoleScope) {
  return `/enterprise/role/create?tab=${scope}`;
}

export function getEnterpriseRoleEditPath(id: string, scope: EnterpriseRoleScope) {
  return `/enterprise/role/edit?id=${id}&tab=${scope}`;
}

export function formatEnterpriseRoleDateTime(date: Date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function createEnterpriseRoleId(
  scope: EnterpriseRoleScope,
  date = new Date()
) {
  return `role_${scope}_${date.getTime()}`;
}

export function normalizeEnterpriseRoleDataViewScope(
  value: unknown
): EnterpriseRoleDataViewScope {
  if (value === 'all' || value === 'department' || value === 'self') {
    return value;
  }

  return DEFAULT_ENTERPRISE_ROLE_DATA_PERMISSIONS.viewScope;
}

export function cloneEnterpriseRoleDataPermissions(
  value?: {
    viewScope?: unknown;
    canViewAllVerificationRecords?: unknown;
  }
): EnterpriseRoleDataPermissions {
  if (value && 'viewScope' in value) {
    return {
      viewScope: normalizeEnterpriseRoleDataViewScope(value.viewScope),
    };
  }

  if (value && 'canViewAllVerificationRecords' in value) {
    return {
      viewScope: 'department',
    };
  }

  return {
    viewScope: DEFAULT_ENTERPRISE_ROLE_DATA_PERMISSIONS.viewScope,
  };
}

export function cloneEnterpriseRolePermissionState(
  value?: Partial<EnterpriseRolePermissionState>,
  scope: EnterpriseRoleScope = 'headquarter'
): EnterpriseRolePermissionState {
  return {
    dataPermissions: cloneEnterpriseRoleDataPermissions(value?.dataPermissions),
    functionPermissionKeys: normalizeEnterpriseRolePermissionKeys(
      value?.functionPermissionKeys,
      scope
    ),
  };
}

export function expandEnterpriseRolePermissionKeys(
  keys: string[],
  scope: EnterpriseRoleScope = 'headquarter'
) {
  const result = new Set<string>();
  const permissionTree = getEnterpriseRolePermissionTree(scope);
  const permissionKeys = ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE[scope];

  keys.forEach((key) => {
    const node = findPermissionNode(key, permissionTree);
    if (!node) {
      return;
    }

    addNodeAndDescendants(node, result);
  });

  return permissionKeys.filter((key) => result.has(key));
}

export function normalizeEnterpriseRolePermissionKeys(
  value: unknown,
  scope: EnterpriseRoleScope = 'headquarter'
) {
  const rawKeys = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
  const filteredKeys = rawKeys.filter((key) =>
    ENTERPRISE_ROLE_PERMISSION_KEY_SET_BY_SCOPE[scope].has(key)
  );

  return expandEnterpriseRolePermissionKeys(filteredKeys, scope);
}

export function getEnterpriseRolePermissionTitles(
  keys: string[],
  scope: EnterpriseRoleScope = 'headquarter'
) {
  const normalizedKeys = normalizeEnterpriseRolePermissionKeys(keys, scope);
  const titleMap = ENTERPRISE_ROLE_PERMISSION_TITLE_MAP_BY_SCOPE[scope];

  return normalizedKeys.map((key) => titleMap[key]);
}

export function areEnterpriseRolePermissionStatesEqual(
  left: EnterpriseRolePermissionState,
  right: EnterpriseRolePermissionState,
  scope: EnterpriseRoleScope = 'headquarter'
) {
  return (
    left.dataPermissions.viewScope === right.dataPermissions.viewScope &&
    JSON.stringify(
      normalizeEnterpriseRolePermissionKeys(left.functionPermissionKeys, scope)
    ) ===
      JSON.stringify(
        normalizeEnterpriseRolePermissionKeys(right.functionPermissionKeys, scope)
      )
  );
}

function normalizeReferenceRoleId(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

function normalizeEnterpriseRoleItem(
  item: Partial<EnterpriseRoleItem>,
  index: number
): EnterpriseRoleItem {
  const employeeCount = Number(item.employeeCount);
  const scope = ROLE_SCOPE_VALUES.includes(item.scope as EnterpriseRoleScope)
    ? (item.scope as EnterpriseRoleScope)
    : 'headquarter';
  const createdAt =
    typeof item.createdAt === 'string' && item.createdAt
      ? item.createdAt
      : formatEnterpriseRoleDateTime(new Date());

  return {
    id: item.id || `enterprise_role_${index + 1}`,
    scope,
    name: typeof item.name === 'string' && item.name ? item.name : `角色${index + 1}`,
    description: typeof item.description === 'string' ? item.description : '',
    employeeCount:
      Number.isFinite(employeeCount) && employeeCount > 0 ? employeeCount : 0,
    isDefault: Boolean(item.isDefault),
    referenceRoleId: normalizeReferenceRoleId(item.referenceRoleId),
    dataPermissions: cloneEnterpriseRoleDataPermissions(item.dataPermissions),
    functionPermissionKeys: normalizeEnterpriseRolePermissionKeys(
      item.functionPermissionKeys,
      scope
    ),
    createdAt,
    updatedAt:
      typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : createdAt,
  };
}

const HEADQUARTER_ALL_PERMISSION_KEYS = [
  ...ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE.headquarter,
];
const REGION_ALL_PERMISSION_KEYS = [
  ...ENTERPRISE_ROLE_PERMISSION_ALL_KEYS_BY_SCOPE.region,
];

const DEFAULT_ENTERPRISE_ROLE_ITEMS: EnterpriseRoleItem[] = [
  normalizeEnterpriseRoleItem(
    {
      id: 'role_headquarter_super_admin',
      scope: 'headquarter',
      name: '超级管理员',
      description: '负责全局组织、权限、员工及核心业务配置的统一管理与策略兜底。',
      employeeCount: 2,
      isDefault: true,
      dataPermissions: {
        viewScope: 'all',
      },
      functionPermissionKeys: HEADQUARTER_ALL_PERMISSION_KEYS,
      createdAt: '2026-04-07 08:40:00',
      updatedAt: '2026-04-07 08:40:00',
    },
    0
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_headquarter_admin',
      scope: 'headquarter',
      name: '总部管理员',
      description: '负责总部组织、权限、员工和关键业务配置的统一管理。',
      employeeCount: 3,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: HEADQUARTER_ALL_PERMISSION_KEYS,
      createdAt: '2026-04-07 09:00:00',
      updatedAt: '2026-04-07 09:00:00',
    },
    1
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_headquarter_product_admin',
      scope: 'headquarter',
      name: '商品管理员',
      description: '负责商品库、类目、属性、上下架策略和商品基础资料的统一维护。',
      employeeCount: 4,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions',
        'permission.product-management',
        'marketing/center',
      ],
      createdAt: '2026-04-07 09:05:00',
      updatedAt: '2026-04-07 09:05:00',
    },
    2
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_headquarter_operation',
      scope: 'headquarter',
      name: '运营',
      description: '负责活动投放、优惠券配置、经营分析、订单跟进和售后流程协同。',
      employeeCount: 7,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions',
        'product/list',
        'permission.order-management',
        'permission.after-sales-management',
        'permission.marketing-management',
      ],
      createdAt: '2026-04-07 09:08:00',
      updatedAt: '2026-04-07 09:08:00',
    },
    3
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_headquarter_finance',
      scope: 'headquarter',
      name: '总部财务',
      description: '负责总部结算、对账、费用审批及财务相关权限管理。',
      employeeCount: 5,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions',
        'permission.order-management',
        'permission.after-sales-management',
        'enterprise/employee',
      ],
      createdAt: '2026-04-07 09:10:00',
      updatedAt: '2026-04-07 09:10:00',
    },
    4
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_headquarter_hr',
      scope: 'headquarter',
      name: '总部人事',
      description: '负责员工档案、岗位编制、入转调离等总部人事管理事项。',
      employeeCount: 2,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions',
        'enterprise/organization',
        'enterprise/department',
        'enterprise/employee',
      ],
      createdAt: '2026-04-07 09:20:00',
      updatedAt: '2026-04-07 09:20:00',
    },
    5
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_store_manager',
      scope: 'store',
      name: '店长',
      description: '负责门店经营、员工安排、商品与订单的日常管理。',
      employeeCount: 8,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions',
        'permission.product-management',
        'permission.order-management',
        'permission.after-sales-management',
        'permission.marketing-management',
      ],
      createdAt: '2026-04-07 10:00:00',
      updatedAt: '2026-04-07 10:00:00',
    },
    6
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_store_cashier',
      scope: 'store',
      name: '收银员',
      description: '负责门店收银、订单核销和基础会员服务。',
      employeeCount: 14,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview.workbench-data',
        'permission.common-functions.view-operate',
        'order/list',
      ],
      createdAt: '2026-04-07 10:10:00',
      updatedAt: '2026-04-07 10:10:00',
    },
    7
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_store_staff',
      scope: 'store',
      name: '店员',
      description: '负责商品陈列、客户接待和门店基础运营事务。',
      employeeCount: 21,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview.ai-assistant',
        'product/list',
        'order/list',
      ],
      createdAt: '2026-04-07 10:20:00',
      updatedAt: '2026-04-07 10:20:00',
    },
    8
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_region_business_admin',
      scope: 'region',
      name: '事业部管理员',
      description: '负责事业部经营目标拆解、区域资源协调、门店策略落地和跨店协同。',
      employeeCount: 3,
      isDefault: true,
      dataPermissions: {
        viewScope: 'all',
      },
      functionPermissionKeys: REGION_ALL_PERMISSION_KEYS,
      createdAt: '2026-04-07 10:50:00',
      updatedAt: '2026-04-07 10:50:00',
    },
    9
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_region_director',
      scope: 'region',
      name: '区域总监',
      description: '负责区域经营目标、门店巡检和跨店资源统筹。',
      employeeCount: 4,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions',
        'permission.product-management',
        'permission.order-management',
        'permission.marketing-management',
      ],
      createdAt: '2026-04-07 11:00:00',
      updatedAt: '2026-04-07 11:00:00',
    },
    10
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_region_operation',
      scope: 'region',
      name: '区域运营',
      description: '负责区域门店运营分析、活动执行和问题跟进。',
      employeeCount: 6,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.marketing-management',
        'product/list',
        'order/list',
      ],
      createdAt: '2026-04-07 11:10:00',
      updatedAt: '2026-04-07 11:10:00',
    },
    11
  ),
  normalizeEnterpriseRoleItem(
    {
      id: 'role_region_supervisor',
      scope: 'region',
      name: '区域督导',
      description: '负责区域门店巡店、服务标准检查和整改闭环跟进。',
      employeeCount: 7,
      isDefault: true,
      dataPermissions: {
        viewScope: 'department',
      },
      functionPermissionKeys: [
        'permission.overview',
        'permission.common-functions.view-operate',
        'order/list',
      ],
      createdAt: '2026-04-07 11:20:00',
      updatedAt: '2026-04-07 11:20:00',
    },
    12
  ),
];

function mergeMissingDefaultRoleItems(items: EnterpriseRoleItem[]) {
  const existingIdSet = new Set(items.map((item) => item.id));
  const missingDefaults = DEFAULT_ENTERPRISE_ROLE_ITEMS.filter(
    (item) => !existingIdSet.has(item.id)
  );

  return missingDefaults.length ? [...items, ...missingDefaults] : items;
}

export function readEnterpriseRoleItems() {
  const stored = readPersistentValue(STORAGE_KEY, DEFAULT_ENTERPRISE_ROLE_ITEMS);
  const rawItems = Array.isArray(stored) ? stored : DEFAULT_ENTERPRISE_ROLE_ITEMS;
  const normalized = rawItems.map((item, index) =>
    normalizeEnterpriseRoleItem(item, index)
  );
  const merged = mergeMissingDefaultRoleItems(normalized);

  if (JSON.stringify(rawItems) !== JSON.stringify(merged)) {
    writePersistentValue(STORAGE_KEY, merged);
  }

  return merged;
}

export function writeEnterpriseRoleItems(items: EnterpriseRoleItem[]) {
  writePersistentValue(
    STORAGE_KEY,
    items.map((item, index) => normalizeEnterpriseRoleItem(item, index))
  );
}

export function findEnterpriseRoleById(
  id: string,
  items: EnterpriseRoleItem[] = readEnterpriseRoleItems()
) {
  return items.find((item) => item.id === id);
}

export function useEnterpriseRoleItems() {
  return usePersistentState(STORAGE_KEY, readEnterpriseRoleItems());
}
