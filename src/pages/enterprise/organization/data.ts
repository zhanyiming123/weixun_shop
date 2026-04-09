import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type OrganizationType = 'store' | 'partner';
export type OrganizationStatus = 'enabled' | 'disabled';

export type OrganizationCapabilityConfig = {
  shopIsolation: boolean;
  shopStatus: boolean;
  selfBuiltProduct: boolean;
  customProductInfo: boolean;
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
  status: OrganizationStatus;
  capabilities: OrganizationCapabilityConfig;
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

const STORAGE_KEY = 'enterprise-organization-items-v1';

export const DEFAULT_ORGANIZATION_CAPABILITIES: OrganizationCapabilityConfig = {
  shopIsolation: false,
  shopStatus: false,
  selfBuiltProduct: false,
  customProductInfo: false,
};

export const DEFAULT_ORGANIZATION_FILTER_VALUES: OrganizationFilterValues = {
  keyword: '',
  managerKeyword: '',
  regionPath: [],
  status: undefined,
};

export const ORGANIZATION_TYPE_LABEL_MAP: Record<OrganizationType, string> = {
  store: '门店',
  partner: '合伙人',
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
  const prefix = type === 'store' ? 'TMP-STORE-' : 'TMP-PARTNER-';
  return `${prefix}${formatCompactDateTime(date)}`;
}

export function createOrganizationId(type: OrganizationType, date = new Date()) {
  return `org_${type}_${date.getTime()}`;
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

function normalizeCapabilities(
  capabilities?: Partial<OrganizationCapabilityConfig>
): OrganizationCapabilityConfig {
  return {
    ...DEFAULT_ORGANIZATION_CAPABILITIES,
    ...capabilities,
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
    status: item.status === 'disabled' ? 'disabled' : 'enabled',
    capabilities: normalizeCapabilities(item.capabilities),
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

export const DEFAULT_ORGANIZATION_ITEMS: OrganizationItem[] = [
  normalizeOrganizationItem(
    {
      id: 'org_store_shanghai_001',
      type: 'store',
      name: '唯寻上海普陀门店',
      code: 'MD-SH-202604080001',
      regionPath: ['shanghai', 'shanghai-city', 'putuo'],
      address: '上海市普陀区曹杨路1888号星光大厦6层',
      contactPhone: '021-62581234',
      managerName: '王璇',
      managerPhone: '138-0000-1111',
      status: 'enabled',
      capabilities: {
        shopIsolation: true,
        shopStatus: true,
        selfBuiltProduct: true,
        customProductInfo: false,
      },
      createdAt: '2026-04-08 09:30:00',
      updatedAt: '2026-04-08 09:30:00',
    },
    0
  ),
  normalizeOrganizationItem(
    {
      id: 'org_partner_suzhou_001',
      type: 'partner',
      name: '苏州园区合伙人',
      code: 'HZ-SZ-202604080001',
      regionPath: ['jiangsu', 'suzhou', 'sip'],
      address: '江苏省苏州市工业园区星湖街218号创意产业园B1栋',
      contactPhone: '0512-67556688',
      managerName: '陈晨',
      managerPhone: '139-0000-2222',
      status: 'enabled',
      capabilities: {
        shopIsolation: false,
        shopStatus: true,
        selfBuiltProduct: false,
        customProductInfo: true,
      },
      createdAt: '2026-04-07 14:10:00',
      updatedAt: '2026-04-07 14:10:00',
    },
    1
  ),
];

export function readOrganizationItems() {
  const stored = readPersistentValue(STORAGE_KEY, DEFAULT_ORGANIZATION_ITEMS);
  const rawItems = Array.isArray(stored) ? stored : DEFAULT_ORGANIZATION_ITEMS;
  const normalized = rawItems.map((item, index) =>
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
