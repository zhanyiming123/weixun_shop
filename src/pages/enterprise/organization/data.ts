import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';
import {
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';

export type OrganizationType = 'store' | 'partner';
export type OrganizationStatus = 'enabled' | 'disabled';

export type OrganizationCapabilityConfig = {
  selfBuiltProduct: boolean;
  selfBuiltMarketingActivity: boolean;
};

type LegacyOrganizationCapabilityConfig = Partial<OrganizationCapabilityConfig> & {
  customProductInfo?: boolean;
};

export type OrganizationCustomFieldKey =
  | 'productPrice'
  | 'specStatus';

export type OrganizationCustomRuleScope =
  | 'allProducts'
  | 'specificProducts'
  | 'specificCategory';

export type OrganizationCustomProductRule = {
  id: string;
  fieldKeys: OrganizationCustomFieldKey[];
  applyScope: OrganizationCustomRuleScope;
  selectedSkuIds: string[];
  selectedCategoryPath: string[];
};

export type OrganizationItem = {
  id: string;
  type: OrganizationType;
  name: string;
  code: string;
  regionPath: string[];
  regionLabel: string;
  address: string;
  contactPhone: string;
  managerName: string;
  managerPhone: string;
  selectedStoreIds: string[];
  status: OrganizationStatus;
  capabilities: OrganizationCapabilityConfig;
  customProductInfoRules: OrganizationCustomProductRule[];
  createdAt: string;
  updatedAt: string;
};

export type OrganizationFilterValues = {
  keyword: string;
  managerKeyword: string;
  regionPath: string[];
  status?: OrganizationStatus;
};

export type OrganizationRegionOption = {
  value: string;
  label: string;
  children?: OrganizationRegionOption[];
};

const STORAGE_KEY = 'enterprise-organization-items-v2';

export const DEFAULT_ORGANIZATION_CAPABILITIES: OrganizationCapabilityConfig = {
  selfBuiltProduct: false,
  selfBuiltMarketingActivity: false,
};

const ORGANIZATION_CUSTOM_FIELD_KEYS: OrganizationCustomFieldKey[] = [
  'productPrice',
  'specStatus',
];

function normalizeCustomProductRule(
  rule: Partial<OrganizationCustomProductRule>,
  index: number
): OrganizationCustomProductRule {
  return {
    id: rule.id || `org_rule_${index + 1}`,
    fieldKeys: Array.isArray(rule.fieldKeys)
      ? rule.fieldKeys.filter((key): key is OrganizationCustomFieldKey =>
          ORGANIZATION_CUSTOM_FIELD_KEYS.includes(key as OrganizationCustomFieldKey)
        )
      : [],
    applyScope:
      rule.applyScope === 'specificProducts' ||
      rule.applyScope === 'specificCategory'
        ? rule.applyScope
        : 'allProducts',
    selectedSkuIds: Array.isArray(rule.selectedSkuIds)
      ? rule.selectedSkuIds.filter((value): value is string => typeof value === 'string')
      : [],
    selectedCategoryPath: Array.isArray(rule.selectedCategoryPath)
      ? rule.selectedCategoryPath.filter(
          (value): value is string => typeof value === 'string'
        )
      : [],
  };
}

export const DEFAULT_ORGANIZATION_FILTER_VALUES: OrganizationFilterValues = {
  keyword: '',
  managerKeyword: '',
  regionPath: [],
  status: undefined,
};

export const ORGANIZATION_TYPE_LABEL_MAP: Record<OrganizationType, string> = {
  store: '店铺',
  partner: '区域',
};

export const ORGANIZATION_STATUS_LABEL_MAP: Record<OrganizationStatus, string> = {
  enabled: '启用',
  disabled: '停用',
};

export const ORGANIZATION_STATUS_OPTIONS = [
  {
    label: ORGANIZATION_STATUS_LABEL_MAP.enabled,
    value: 'enabled' as const,
  },
  {
    label: ORGANIZATION_STATUS_LABEL_MAP.disabled,
    value: 'disabled' as const,
  },
];

export const ORGANIZATION_REGION_OPTIONS: OrganizationRegionOption[] = [
  {
    value: 'shanghai',
    label: '上海',
    children: [
      {
        value: 'shanghai-city',
        label: '上海市',
        children: [
          {
            value: 'putuo',
            label: '普陀区',
          },
          {
            value: 'jingan',
            label: '静安区',
          },
          {
            value: 'pudong',
            label: '浦东新区',
          },
        ],
      },
    ],
  },
  {
    value: 'beijing',
    label: '北京',
    children: [
      {
        value: 'beijing-city',
        label: '北京市',
        children: [
          {
            value: 'chaoyang',
            label: '朝阳区',
          },
          {
            value: 'haidian',
            label: '海淀区',
          },
        ],
      },
    ],
  },
  {
    value: 'jiangsu',
    label: '江苏',
    children: [
      {
        value: 'suzhou',
        label: '苏州市',
        children: [
          {
            value: 'gusu',
            label: '姑苏区',
          },
          {
            value: 'sip',
            label: '工业园区',
          },
        ],
      },
      {
        value: 'nanjing',
        label: '南京市',
        children: [
          {
            value: 'gulou',
            label: '鼓楼区',
          },
          {
            value: 'jianye',
            label: '建邺区',
          },
        ],
      },
    ],
  },
  {
    value: 'zhejiang',
    label: '浙江',
    children: [
      {
        value: 'hangzhou',
        label: '杭州市',
        children: [
          {
            value: 'xihu',
            label: '西湖区',
          },
        ],
      },
    ],
  },
  {
    value: 'guangdong',
    label: '广东',
    children: [
      {
        value: 'guangzhou',
        label: '广州市',
        children: [
          {
            value: 'tianhe',
            label: '天河区',
          },
        ],
      },
      {
        value: 'shenzhen',
        label: '深圳市',
        children: [
          {
            value: 'nanshan',
            label: '南山区',
          },
        ],
      },
    ],
  },
  {
    value: 'sichuan',
    label: '四川',
    children: [
      {
        value: 'chengdu',
        label: '成都市',
        children: [
          {
            value: 'gaoxin',
            label: '高新区',
          },
        ],
      },
    ],
  },
  {
    value: 'shaanxi',
    label: '陕西',
    children: [
      {
        value: 'xian',
        label: '西安市',
        children: [
          {
            value: 'yanta',
            label: '雁塔区',
          },
        ],
      },
    ],
  },
];

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

export function formatOrganizationDateTime(date: Date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatCompactDateTime(date: Date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}${month}${day}${hour}${minute}${second}`;
}

export function createTempOrganizationCode(
  type: OrganizationType,
  date = new Date()
) {
  const prefix = type === 'store' ? 'TMP-STORE-' : 'TMP-REGION-';
  return `${prefix}${formatCompactDateTime(date)}`;
}

export function createOrganizationId(type: OrganizationType, date = new Date()) {
  return `org_${type}_${date.getTime()}`;
}

export function createOrganizationCustomRuleId(date = new Date()) {
  return `org_rule_${date.getTime()}_${Math.floor(Math.random() * 1000)}`;
}

export function readOrganizationSelectableStoreItems() {
  return readProductStoreItems().filter(
    (item): item is ProductStoreItem => item.type === 'store'
  );
}

export function normalizeOrganizationSelectedStoreIds(
  selectedStoreIds: string[] = [],
  storeItems: ProductStoreItem[] = readOrganizationSelectableStoreItems()
) {
  const availableStoreIds = new Set(storeItems.map((item) => item.id));
  const uniqueStoreIds = new Set(
    selectedStoreIds.filter((item) => availableStoreIds.has(item))
  );

  return storeItems
    .map((item) => item.id)
    .filter((item) => uniqueStoreIds.has(item));
}

export function getOrganizationSelectedStoreNames(
  selectedStoreIds: string[] = [],
  storeItems: ProductStoreItem[] = readOrganizationSelectableStoreItems()
) {
  const nameMap = new Map(storeItems.map((item) => [item.id, item.name]));

  return normalizeOrganizationSelectedStoreIds(selectedStoreIds, storeItems)
    .map((item) => nameMap.get(item))
    .filter((item): item is string => Boolean(item));
}

export function getOrganizationSelectedStoreSummary(
  selectedStoreIds: string[] = [],
  storeItems: ProductStoreItem[] = readOrganizationSelectableStoreItems()
) {
  const normalizedStoreIds = normalizeOrganizationSelectedStoreIds(
    selectedStoreIds,
    storeItems
  );

  if (!normalizedStoreIds.length) {
    return '';
  }

  if (normalizedStoreIds.length === storeItems.length) {
    return `全部店铺（${storeItems.length}家）`;
  }

  return getOrganizationSelectedStoreNames(normalizedStoreIds, storeItems).join('、');
}

export function getOrganizationRegionLabel(
  path: string[],
  options: OrganizationRegionOption[] = ORGANIZATION_REGION_OPTIONS
) {
  if (!path.length) {
    return '';
  }

  const labels: string[] = [];
  let currentOptions = options;

  path.forEach((value) => {
    const matched = currentOptions.find((item) => item.value === value);

    if (!matched) {
      return;
    }

    labels.push(matched.label);
    currentOptions = matched.children || [];
  });

  return labels.join(' / ');
}

export function normalizeOrganizationCapabilities(
  capabilities?: LegacyOrganizationCapabilityConfig
): OrganizationCapabilityConfig {
  const { customProductInfo: _legacyCustomProductInfo, ...nextCapabilities } =
    capabilities || {};
  const legacyMarketingCapability =
    typeof capabilities?.selfBuiltMarketingActivity === 'boolean'
      ? capabilities.selfBuiltMarketingActivity
      : Boolean(capabilities?.customProductInfo);

  return {
    ...DEFAULT_ORGANIZATION_CAPABILITIES,
    ...nextCapabilities,
    selfBuiltMarketingActivity: legacyMarketingCapability,
  };
}

function normalizeOrganizationItem(
  item: Partial<OrganizationItem>,
  index: number
): OrganizationItem {
  const type = item.type === 'partner' ? 'partner' : 'store';
  const createdAt = item.createdAt || '2026-04-09 09:00:00';
  const regionPath = Array.isArray(item.regionPath)
    ? item.regionPath.filter((value): value is string => typeof value === 'string')
    : [];
  const regionLabel = item.regionLabel || getOrganizationRegionLabel(regionPath);

  return {
    id: item.id || `org_${type}_${index + 1}`,
    type,
    name: item.name || '',
    code: item.code || createTempOrganizationCode(type),
    regionPath,
    regionLabel,
    address: item.address || '',
    contactPhone: item.contactPhone || '',
    managerName: item.managerName || '',
    managerPhone: item.managerPhone || '',
    selectedStoreIds: Array.isArray(item.selectedStoreIds)
      ? normalizeOrganizationSelectedStoreIds(item.selectedStoreIds)
      : [],
    status: item.status === 'disabled' ? 'disabled' : 'enabled',
    capabilities: normalizeOrganizationCapabilities(item.capabilities),
    customProductInfoRules: Array.isArray(item.customProductInfoRules)
      ? item.customProductInfoRules.map((rule, ruleIndex) =>
          normalizeCustomProductRule(rule, ruleIndex)
        )
      : [],
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

export const DEFAULT_ORGANIZATION_ITEMS: OrganizationItem[] = [
  normalizeOrganizationItem(
    {
      id: 'org_partner_huanan_001',
      type: 'partner',
      name: '唯寻华南',
      code: 'QY-HN-202605060001',
      regionPath: ['guangdong'],
      address: '广东省广州市天河区珠江新城华夏路28号富力盈信大厦10层',
      contactPhone: '020-88886666',
      managerName: '林岚',
      managerPhone: '139-0000-3333',
      selectedStoreIds: ['store_guangzhou', 'store_shenzhen'],
      status: 'enabled',
      capabilities: DEFAULT_ORGANIZATION_CAPABILITIES,
      customProductInfoRules: [],
      createdAt: '2026-05-06 09:00:00',
      updatedAt: '2026-05-06 09:00:00',
    },
    0
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_xiangmu_001',
      type: 'store',
      name: '唯寻橡沐店铺',
      code: 'MD-XM-202605060001',
      regionPath: ['shanghai', 'shanghai-city', 'jingan'],
      address: '上海市静安区南京西路819号中创大厦12层',
      contactPhone: '021-51000001',
      managerName: '宋知夏',
      managerPhone: '138-2100-4501',
      selectedStoreIds: ['store_xiangmu'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 09:10:00',
      updatedAt: '2026-05-06 09:10:00',
    },
    1
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_qingshao_001',
      type: 'store',
      name: '唯寻青少店铺',
      code: 'MD-QS-202605060001',
      regionPath: ['beijing', 'beijing-city', 'chaoyang'],
      address: '北京市朝阳区东三环中路7号财富中心B座8层',
      contactPhone: '010-62000001',
      managerName: '顾言初',
      managerPhone: '138-2100-4502',
      selectedStoreIds: ['store_qingshao'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: false,
      },
      createdAt: '2026-05-06 09:20:00',
      updatedAt: '2026-05-06 09:20:00',
    },
    2
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_beijing_001',
      type: 'store',
      name: '唯寻北京店铺',
      code: 'MD-BJ-202605060001',
      regionPath: ['beijing', 'beijing-city', 'haidian'],
      address: '北京市海淀区中关村大街27号中关村大厦6层',
      contactPhone: '010-62000002',
      managerName: '谢安然',
      managerPhone: '138-2100-4503',
      selectedStoreIds: ['store_beijing'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 09:30:00',
      updatedAt: '2026-05-06 09:30:00',
    },
    3
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_suzhou_001',
      type: 'store',
      name: '唯寻苏州店铺',
      code: 'MD-SU-202605060001',
      regionPath: ['jiangsu', 'suzhou', 'sip'],
      address: '江苏省苏州市工业园区星湖街218号创意产业园B1栋',
      contactPhone: '0512-67558866',
      managerName: '陈晨',
      managerPhone: '138-2100-4504',
      selectedStoreIds: ['store_suzhou'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 09:40:00',
      updatedAt: '2026-05-06 09:40:00',
    },
    4
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_guangzhou_001',
      type: 'store',
      name: '唯寻广州店铺',
      code: 'MD-GZ-202605060001',
      regionPath: ['guangdong', 'guangzhou', 'tianhe'],
      address: '广州市天河区珠江新城华夏路28号富力盈信大厦10层',
      contactPhone: '020-88889999',
      managerName: '黄颖',
      managerPhone: '138-2100-4506',
      selectedStoreIds: ['store_guangzhou'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 09:50:00',
      updatedAt: '2026-05-06 09:50:00',
    },
    5
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_shenzhen_001',
      type: 'store',
      name: '唯寻深圳店铺',
      code: 'MD-SZ-202605060001',
      regionPath: ['guangdong', 'shenzhen', 'nanshan'],
      address: '深圳市南山区海德三道航天科技广场A座9层',
      contactPhone: '0755-88991234',
      managerName: '赵琪',
      managerPhone: '138-2100-4505',
      selectedStoreIds: ['store_shenzhen'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 10:00:00',
      updatedAt: '2026-05-06 10:00:00',
    },
    6
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_future_academy_001',
      type: 'store',
      name: '唯寻未来学院店铺',
      code: 'MD-WL-202605060001',
      regionPath: ['shanghai', 'shanghai-city', 'pudong'],
      address: '上海市浦东新区张江路665号德宏大厦15层',
      contactPhone: '021-51000002',
      managerName: '许知远',
      managerPhone: '138-2100-4507',
      selectedStoreIds: ['store_future_academy'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 10:10:00',
      updatedAt: '2026-05-06 10:10:00',
    },
    7
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_chengdu_001',
      type: 'store',
      name: '唯寻成都店铺',
      code: 'MD-CD-202605060001',
      regionPath: ['sichuan', 'chengdu', 'gaoxin'],
      address: '成都市高新区天府三街69号新希望国际A座11层',
      contactPhone: '028-68880001',
      managerName: '陆星遥',
      managerPhone: '138-2100-4508',
      selectedStoreIds: ['store_chengdu'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 10:20:00',
      updatedAt: '2026-05-06 10:20:00',
    },
    8
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_xian_001',
      type: 'store',
      name: '唯寻西安店铺',
      code: 'MD-XA-202605060001',
      regionPath: ['shaanxi', 'xian', 'yanta'],
      address: '西安市雁塔区锦业路1号都市之门C座7层',
      contactPhone: '029-68880001',
      managerName: '沈知行',
      managerPhone: '138-2100-4509',
      selectedStoreIds: ['store_xian'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 10:30:00',
      updatedAt: '2026-05-06 10:30:00',
    },
    9
  ),
  normalizeOrganizationItem(
    {
      id: 'org_store_shanghai_001',
      type: 'store',
      name: '唯寻上海店铺',
      code: 'MD-SH-202605060001',
      regionPath: ['shanghai', 'shanghai-city', 'putuo'],
      address: '上海市普陀区长寿路1118号悦达889广场5层',
      contactPhone: '021-51000003',
      managerName: '林嘉禾',
      managerPhone: '138-2100-4510',
      selectedStoreIds: ['store_shanghai'],
      status: 'enabled',
      capabilities: {
        selfBuiltProduct: true,
        selfBuiltMarketingActivity: true,
      },
      createdAt: '2026-05-06 10:40:00',
      updatedAt: '2026-05-06 10:40:00',
    },
    10
  ),
];

function migrateOrganizationSeedItem(item: Partial<OrganizationItem>) {
  if (
    [
      'org_partner_suzhou_001',
      'org_partner_shanghai_001',
      'org_partner_beijing_001',
      'org_store_hangzhou_001',
      'org_partner_hangzhou_001',
      'org_store_nanjing_001',
      'org_store_shanghai_putuo_001',
      'org_store_shanghai_pudong_001',
      'org_store_beijing_chaoyang_001',
      'org_store_beijing_haidian_001',
      'org_store_nanjing_gulou_001',
    ].includes(item.id || '')
  ) {
    return null;
  }

  return item;
}

function mergeOrganizationSeedItems(
  rawItems: Partial<OrganizationItem>[] = []
) {
  const normalizedRawItems = rawItems.filter(
    (item): item is Partial<OrganizationItem> =>
      Boolean(item) && typeof item === 'object'
  );
  const migratedRawItems = normalizedRawItems
    .map((item) => migrateOrganizationSeedItem(item))
    .filter((item): item is Partial<OrganizationItem> => Boolean(item));
  const existingIdSet = new Set(
    migratedRawItems
      .map((item) => item.id)
      .filter((item): item is string => typeof item === 'string' && Boolean(item))
  );

  return [
    ...migratedRawItems,
    ...DEFAULT_ORGANIZATION_ITEMS.filter((item) => !existingIdSet.has(item.id)),
  ];
}

export function readOrganizationItems() {
  const stored = readPersistentValue(STORAGE_KEY, DEFAULT_ORGANIZATION_ITEMS);
  const rawItems = Array.isArray(stored) ? stored : DEFAULT_ORGANIZATION_ITEMS;
  const mergedRawItems = mergeOrganizationSeedItems(rawItems);
  const normalized = mergedRawItems.map((item, index) =>
    normalizeOrganizationItem(item, index)
  );

  if (JSON.stringify(rawItems) !== JSON.stringify(normalized)) {
    writePersistentValue(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function writeOrganizationItems(items: OrganizationItem[]) {
  writePersistentValue(
    STORAGE_KEY,
    items.map((item, index) => normalizeOrganizationItem(item, index))
  );
}

export function useOrganizationItems() {
  return usePersistentState(STORAGE_KEY, readOrganizationItems());
}
