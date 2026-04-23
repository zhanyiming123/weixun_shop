import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { isSSR } from '@/utils/is';
import {
  OrganizationItem,
  readOrganizationItems,
} from '@/pages/enterprise/organization/data';
import {
  ProductOwnershipConfigItem,
  readProductOwnershipItems,
  writeProductOwnershipItems,
} from '@/pages/product/category/data';
import {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type EnterpriseDepartmentScope = 'headquarter' | 'store';

export type EnterpriseDepartmentStoreOption = {
  value: string;
  label: string;
};

export type EnterpriseDepartmentTreeNode = {
  key: string;
  value: string;
  title: string;
  children?: EnterpriseDepartmentTreeNode[];
};

export type EnterpriseDepartmentItem = {
  id: string;
  name: string;
  code: string;
  scope: EnterpriseDepartmentScope;
  storeId: string | null;
  parentId: string | null;
  managerName: string;
  headcount: number;
  description: string;
  updatedAt: string;
};

type EnterpriseDepartmentHeadquarterMeta = Pick<
  EnterpriseDepartmentItem,
  'id' | 'code' | 'managerName' | 'headcount' | 'description' | 'updatedAt'
>;

const STORAGE_KEY = 'enterprise-department-items-v4';

const LEGACY_TAB_STORAGE_KEY = 'enterprise-department-items-v2';
const LEGACY_SINGLE_STORAGE_KEY = 'enterprise-department-items-v1';
const LEGACY_STORE_DEFAULT_DEPARTMENT_ID_PREFIX = 'department_store_';
const STORE_TEMPLATE_DEPARTMENT_ID_PREFIX = 'department_campus_';
const STORE_DEFAULT_DEPARTMENT_UPDATED_AT = '2026-04-20 10:00:00';

type StoreDepartmentTemplateNode = {
  suffix: string;
  name: string;
  codeSuffix: string;
  headcount: number;
  description: string;
  managerName?: 'store_manager';
  children?: StoreDepartmentTemplateNode[];
};

export const ENTERPRISE_DEPARTMENT_SCOPE_LABEL_MAP: Record<
  EnterpriseDepartmentScope,
  string
> = {
  headquarter: '总部',
  store: '门店',
};

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

export function formatEnterpriseDepartmentDateTime(date: Date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function hasStorageValue(key: string) {
  if (isSSR) {
    return false;
  }

  return localStorage.getItem(key) !== null;
}

function normalizeEnterpriseDepartmentScope(
  value: unknown
): EnterpriseDepartmentScope {
  return value === 'store' ? 'store' : 'headquarter';
}

function normalizeDepartmentCode(rawCode: unknown, fallbackCode: string) {
  const normalizedCode =
    typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';

  return normalizedCode || fallbackCode;
}

function normalizeHeadcount(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function createHeadquarterDepartmentCode(id: string) {
  const normalizedId = id
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

  return normalizedId ? `HQ-${normalizedId}` : 'HQ-DEPT';
}

function readStoreOrganizations() {
  return readOrganizationItems().filter((item) => item.type === 'store');
}

export function readEnterpriseDepartmentStoreOptions(
  storeOrganizations: OrganizationItem[] = readStoreOrganizations()
): EnterpriseDepartmentStoreOption[] {
  return storeOrganizations.map((item) => ({
    value: item.id,
    label: item.name,
  }));
}

const STORE_DEPARTMENT_TEMPLATE: StoreDepartmentTemplateNode[] = [
  {
    suffix: 'principal-office',
    name: '校区校长办公室',
    codeSuffix: 'PRINCIPAL',
    headcount: 2,
    description: '负责校区经营目标管理、跨部门协调与关键决策推进。',
    managerName: 'store_manager',
  },
  {
    suffix: 'admission-signing-center',
    name: '咨询与签约中心',
    codeSuffix: 'ADMISSION',
    headcount: 10,
    description: '负责意向学员咨询接待、需求诊断、签约转化与阶段目标管理。',
    children: [
      {
        suffix: 'admission-planning-team',
        name: '留学规划咨询组',
        codeSuffix: 'ADMISSION-PLAN',
        headcount: 6,
        description: '负责学员背景评估、规划路径设计和咨询方案输出。',
      },
      {
        suffix: 'admission-signing-team',
        name: '签约转化组',
        codeSuffix: 'ADMISSION-SIGN',
        headcount: 4,
        description: '负责咨询跟进、签约推进与转化数据复盘。',
      },
    ],
  },
  {
    suffix: 'application-essay-center',
    name: '申请与文书中心',
    codeSuffix: 'APPLICATION',
    headcount: 9,
    description: '负责目标院校申请执行、文书交付与签证材料推进。',
    children: [
      {
        suffix: 'application-team',
        name: '选校申请组',
        codeSuffix: 'APPLICATION-SCHOOL',
        headcount: 3,
        description: '负责院校匹配、申请流程推进与结果跟踪。',
      },
      {
        suffix: 'essay-team',
        name: '文书服务组',
        codeSuffix: 'APPLICATION-ESSAY',
        headcount: 4,
        description: '负责文书策划、撰写指导、版本交付与质量把控。',
      },
      {
        suffix: 'visa-team',
        name: '签证服务组',
        codeSuffix: 'APPLICATION-VISA',
        headcount: 2,
        description: '负责签证申请材料准备、递签支持与入境流程指导。',
      },
    ],
  },
  {
    suffix: 'language-test-center',
    name: '语言与标化培训中心',
    codeSuffix: 'LANGUAGE',
    headcount: 8,
    description: '负责雅思、托福及 SAT 等课程教学交付与学习效果管理。',
    children: [
      {
        suffix: 'ielts-team',
        name: '雅思教学组',
        codeSuffix: 'LANGUAGE-IELTS',
        headcount: 4,
        description: '负责雅思课程教学、模考评估和学习计划跟进。',
      },
      {
        suffix: 'toefl-sat-team',
        name: '托福/SAT 教学组',
        codeSuffix: 'LANGUAGE-TOEFL-SAT',
        headcount: 4,
        description: '负责托福与 SAT 课程教学、阶段测评与提分方案。',
      },
    ],
  },
  {
    suffix: 'academic-student-service-center',
    name: '教务与学员服务中心',
    codeSuffix: 'SERVICE',
    headcount: 7,
    description: '负责排课教务、在读服务、续费衔接和满意度管理。',
    children: [
      {
        suffix: 'schedule-team',
        name: '排课教务组',
        codeSuffix: 'SERVICE-SCHEDULE',
        headcount: 3,
        description: '负责师资排班、课程排期和教学资源协调。',
      },
      {
        suffix: 'homeroom-team',
        name: '班主任服务组',
        codeSuffix: 'SERVICE-HOMEROOM',
        headcount: 4,
        description: '负责在读学员学习跟进、家校沟通与续费服务支持。',
      },
    ],
  },
  {
    suffix: 'marketing-channel-center',
    name: '市场与渠道中心',
    codeSuffix: 'MARKETING',
    headcount: 6,
    description: '负责线索增长、品牌传播和本地化渠道合作拓展。',
    children: [
      {
        suffix: 'new-media-team',
        name: '新媒体运营组',
        codeSuffix: 'MARKETING-MEDIA',
        headcount: 3,
        description: '负责内容运营、账号增长与线上获客线索管理。',
      },
      {
        suffix: 'channel-team',
        name: '渠道拓展组',
        codeSuffix: 'MARKETING-CHANNEL',
        headcount: 3,
        description: '负责学校/机构合作拓展、活动联动和渠道转化管理。',
      },
    ],
  },
  {
    suffix: 'operations-support-center',
    name: '运营支持中心',
    codeSuffix: 'SUPPORT',
    headcount: 5,
    description: '负责校区行政、人力与财务协同，保障组织稳定运行。',
    children: [
      {
        suffix: 'hr-admin-team',
        name: '人事行政组',
        codeSuffix: 'SUPPORT-HR-ADMIN',
        headcount: 3,
        description: '负责人事办理、行政支持与办公环境管理。',
      },
      {
        suffix: 'finance-support-team',
        name: '财务支持组',
        codeSuffix: 'SUPPORT-FINANCE',
        headcount: 2,
        description: '负责收支核对、对账报表与财务流程支持。',
      },
    ],
  },
];

function createStoreDepartmentId(storeId: string, suffix: string) {
  return `${STORE_TEMPLATE_DEPARTMENT_ID_PREFIX}${storeId}_${suffix}`;
}

function buildStoreDepartmentCodePrefix(store: OrganizationItem, index: number) {
  const normalizedCode =
    typeof store.code === 'string'
      ? store.code
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : '';

  return normalizedCode || `STORE-${index + 1}`;
}

function createStoreDepartmentItemsByTemplate(
  store: OrganizationItem,
  index: number,
  templateNodes: StoreDepartmentTemplateNode[] = STORE_DEPARTMENT_TEMPLATE
) {
  const codePrefix = buildStoreDepartmentCodePrefix(store, index);

  function buildItems(
    nodes: StoreDepartmentTemplateNode[],
    parentId: string | null = null
  ): EnterpriseDepartmentItem[] {
    return nodes.flatMap((node) => {
      const currentId = createStoreDepartmentId(store.id, node.suffix);
      const currentItem: EnterpriseDepartmentItem = {
        id: currentId,
        name: node.name,
        code: `${codePrefix}-${node.codeSuffix}`,
        scope: 'store',
        storeId: store.id,
        parentId,
        managerName: node.managerName === 'store_manager' ? store.managerName : '',
        headcount: node.headcount,
        description: node.description,
        updatedAt: STORE_DEFAULT_DEPARTMENT_UPDATED_AT,
      };

      return [currentItem, ...buildItems(node.children || [], currentId)];
    });
  }

  return buildItems(templateNodes);
}

function createStoreDepartmentItems(store: OrganizationItem, index: number) {
  return createStoreDepartmentItemsByTemplate(store, index);
}

function createDefaultStoreDepartmentItems(
  storeOrganizations: OrganizationItem[] = readStoreOrganizations()
) {
  return storeOrganizations.flatMap((store, index) =>
    createStoreDepartmentItems(store, index)
  );
}

function normalizeDepartmentItem(
  item: Partial<EnterpriseDepartmentItem>,
  index: number
): EnterpriseDepartmentItem {
  const scope = normalizeEnterpriseDepartmentScope(item.scope);

  return {
    id: item.id || `department_${index + 1}`,
    name: item.name || `部门${index + 1}`,
    code: normalizeDepartmentCode(item.code, `DEPT-${index + 1}`),
    scope,
    storeId:
      scope === 'store' && typeof item.storeId === 'string' && item.storeId
        ? item.storeId
        : null,
    parentId: typeof item.parentId === 'string' ? item.parentId : null,
    managerName: item.managerName || '',
    headcount: normalizeHeadcount(item.headcount),
    description: item.description || '',
    updatedAt: item.updatedAt || formatEnterpriseDepartmentDateTime(new Date()),
  };
}

function normalizeDepartmentItems(rawItems: Partial<EnterpriseDepartmentItem>[] = []) {
  return rawItems.map((item, index) => normalizeDepartmentItem(item, index));
}

function normalizeHeadquarterMetaItem(
  item: Partial<EnterpriseDepartmentItem>,
  fallbackId: string
): EnterpriseDepartmentHeadquarterMeta {
  const nextId = item.id || fallbackId;

  return {
    id: nextId,
    code: normalizeDepartmentCode(
      item.code,
      createHeadquarterDepartmentCode(nextId)
    ),
    managerName: item.managerName || '',
    headcount: normalizeHeadcount(item.headcount),
    description: item.description || '',
    updatedAt: item.updatedAt || formatEnterpriseDepartmentDateTime(new Date()),
  };
}

function extractHeadquarterMetaItems(items: EnterpriseDepartmentItem[]) {
  return items
    .filter((item) => item.scope === 'headquarter')
    .map(
      ({
        id,
        code,
        managerName,
        headcount,
        description,
        updatedAt,
      }): EnterpriseDepartmentHeadquarterMeta => ({
        id,
        code,
        managerName,
        headcount,
        description,
        updatedAt,
      })
    );
}

function buildHeadquarterDepartmentItems(
  ownershipItems: ProductOwnershipConfigItem[],
  rawMetaItems: Partial<EnterpriseDepartmentItem>[] = []
) {
  const metaMap = new Map(
    rawMetaItems
      .filter(
        (item): item is Partial<EnterpriseDepartmentItem> & { id: string } =>
          typeof item.id === 'string' && item.id.trim().length > 0
      )
      .map((item) => [item.id, normalizeHeadquarterMetaItem(item, item.id)])
  );

  return ownershipItems.map((item) => {
    const meta =
      metaMap.get(item.id) || normalizeHeadquarterMetaItem({ id: item.id }, item.id);

    return {
      id: item.id,
      name: item.name,
      code: meta.code,
      scope: 'headquarter' as const,
      storeId: null,
      parentId: item.parentId,
      managerName: meta.managerName,
      headcount: meta.headcount,
      description: meta.description,
      updatedAt: meta.updatedAt,
    };
  });
}

function toProductOwnershipItems(items: EnterpriseDepartmentItem[]) {
  return items
    .filter((item) => item.scope === 'headquarter')
    .map(
      ({ id, name, parentId }): ProductOwnershipConfigItem => ({
        id,
        name,
        parentId,
      })
    );
}

function cloneStoreTreeToTargetStore(
  items: EnterpriseDepartmentItem[],
  storeId: string
) {
  const idMap = new Map(
    items.map((item) => [item.id, `${item.id}__${storeId}`])
  );

  return items.map((item) => ({
    ...item,
    id: idMap.get(item.id) || item.id,
    storeId,
    parentId: item.parentId ? idMap.get(item.parentId) || item.parentId : null,
  }));
}

function isLegacySystemStoreDepartment(item: EnterpriseDepartmentItem) {
  if (item.scope !== 'store' || !item.storeId) {
    return false;
  }

  return item.id.startsWith(`${LEGACY_STORE_DEFAULT_DEPARTMENT_ID_PREFIX}${item.storeId}_`);
}

function isTemplateStoreDepartment(item: EnterpriseDepartmentItem) {
  if (item.scope !== 'store' || !item.storeId) {
    return false;
  }

  return item.id.startsWith(`${STORE_TEMPLATE_DEPARTMENT_ID_PREFIX}${item.storeId}_`);
}

function migrateStoreTemplateItems(
  storeItems: EnterpriseDepartmentItem[],
  storeOrganizations: OrganizationItem[]
) {
  const storeItemGroups = new Map<string, EnterpriseDepartmentItem[]>();

  storeItems.forEach((item) => {
    if (!item.storeId) {
      return;
    }

    const currentItems = storeItemGroups.get(item.storeId) || [];
    currentItems.push(item);
    storeItemGroups.set(item.storeId, currentItems);
  });

  const knownStoreIdSet = new Set(storeOrganizations.map((item) => item.id));
  const migratedKnownStoreItems = storeOrganizations.flatMap((store, index) => {
    const templateItems = createStoreDepartmentItems(store, index);
    const currentStoreItems = storeItemGroups.get(store.id) || [];

    if (!currentStoreItems.length) {
      return templateItems;
    }

    const customItems = currentStoreItems
      .filter(
        (item) =>
          !isLegacySystemStoreDepartment(item) && !isTemplateStoreDepartment(item)
      )
      .reduce<EnterpriseDepartmentItem[]>((accumulator, item) => {
        if (accumulator.some((current) => current.id === item.id)) {
          return accumulator;
        }

        accumulator.push({ ...item });
        return accumulator;
      }, []);
    const validParentIdSet = new Set([
      ...templateItems.map((item) => item.id),
      ...customItems.map((item) => item.id),
    ]);
    const normalizedCustomItems = customItems.map((item) => ({
      ...item,
      parentId:
        item.parentId && validParentIdSet.has(item.parentId) ? item.parentId : null,
    }));

    return [...templateItems, ...normalizedCustomItems];
  });

  const unmanagedStoreItems = storeItems.filter(
    (item) => !item.storeId || !knownStoreIdSet.has(item.storeId)
  );

  return [...migratedKnownStoreItems, ...unmanagedStoreItems];
}

function migrateGenericStoreItems(
  items: EnterpriseDepartmentItem[],
  storeOrganizations: OrganizationItem[]
) {
  const headquarterItems = items.filter((item) => item.scope === 'headquarter');
  const storeItems = items.filter((item) => item.scope === 'store');

  if (!storeItems.length) {
    return [...headquarterItems, ...createDefaultStoreDepartmentItems(storeOrganizations)];
  }

  const scopedStoreItems = storeItems.filter((item) => item.storeId);
  const genericStoreItems = storeItems.filter((item) => !item.storeId);

  if (!genericStoreItems.length) {
    return [...headquarterItems, ...migrateStoreTemplateItems(scopedStoreItems, storeOrganizations)];
  }

  const existingStoreIds = new Set(
    scopedStoreItems
      .map((item) => item.storeId)
      .filter((item): item is string => Boolean(item))
  );

  const clonedStoreItems = storeOrganizations.flatMap((store) => {
    if (existingStoreIds.has(store.id)) {
      return [];
    }

    return cloneStoreTreeToTargetStore(genericStoreItems, store.id);
  });

  return [
    ...headquarterItems,
    ...migrateStoreTemplateItems(
      [...scopedStoreItems, ...clonedStoreItems],
      storeOrganizations
    ),
  ];
}

function migrateSingleTreeItems(
  rawItems: Partial<EnterpriseDepartmentItem>[],
  storeOrganizations: OrganizationItem[]
) {
  const normalizedHeadquarterItems = rawItems.map((item, index) =>
    normalizeDepartmentItem(
      {
        ...item,
        scope: 'headquarter',
        storeId: null,
      },
      index
    )
  );

  return [
    ...normalizedHeadquarterItems,
    ...migrateStoreTemplateItems(createDefaultStoreDepartmentItems(storeOrganizations), storeOrganizations),
  ];
}

function migrateDepartmentItems(
  items: EnterpriseDepartmentItem[],
  storeOrganizations: OrganizationItem[]
) {
  const headquarterItems = items.filter((item) => item.scope === 'headquarter');
  const scopedStoreItems = items.filter((item) => item.scope === 'store' && item.storeId);
  const genericStoreItems = items.filter((item) => item.scope === 'store' && !item.storeId);
  const normalizedStoreItems = genericStoreItems.length
    ? migrateGenericStoreItems(
        [...headquarterItems, ...scopedStoreItems, ...genericStoreItems],
        storeOrganizations
      ).filter((item) => item.scope === 'store')
    : migrateStoreTemplateItems(scopedStoreItems, storeOrganizations);

  return [...headquarterItems, ...normalizedStoreItems];
}

function readPersistedDepartmentItems(
  storeOrganizations: OrganizationItem[] = readStoreOrganizations()
) {
  if (hasStorageValue(STORAGE_KEY)) {
    const persistedItems = normalizeDepartmentItems(
      readPersistentValue<Partial<EnterpriseDepartmentItem>[]>(STORAGE_KEY, [])
    );
    const migratedItems = migrateDepartmentItems(persistedItems, storeOrganizations);

    if (JSON.stringify(persistedItems) !== JSON.stringify(migratedItems)) {
      writePersistentValue(STORAGE_KEY, migratedItems);
    }

    return migratedItems;
  }

  if (hasStorageValue(LEGACY_TAB_STORAGE_KEY)) {
    const migratedItems = migrateGenericStoreItems(
      normalizeDepartmentItems(
        readPersistentValue<Partial<EnterpriseDepartmentItem>[]>(
          LEGACY_TAB_STORAGE_KEY,
          []
        )
      ),
      storeOrganizations
    );

    writePersistentValue(STORAGE_KEY, migratedItems);
    return migratedItems;
  }

  if (hasStorageValue(LEGACY_SINGLE_STORAGE_KEY)) {
    const migratedItems = migrateSingleTreeItems(
      readPersistentValue<Partial<EnterpriseDepartmentItem>[]>(
        LEGACY_SINGLE_STORAGE_KEY,
        []
      ),
      storeOrganizations
    );

    writePersistentValue(STORAGE_KEY, migratedItems);
    return migratedItems;
  }

  const defaultItems = createDefaultStoreDepartmentItems(storeOrganizations);
  writePersistentValue(STORAGE_KEY, defaultItems);

  return defaultItems;
}

export function readEnterpriseDepartmentItems() {
  const storeOrganizations = readStoreOrganizations();
  const persistedItems = readPersistedDepartmentItems(storeOrganizations);
  const headquarterItems = buildHeadquarterDepartmentItems(
    readProductOwnershipItems(),
    extractHeadquarterMetaItems(persistedItems)
  );
  const storeItems = persistedItems.filter((item) => item.scope === 'store');

  return [...headquarterItems, ...storeItems];
}

export function getEnterpriseDepartmentItemsByScope(
  scope: EnterpriseDepartmentScope,
  storeId?: string,
  items: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  return items.filter((item) => {
    if (item.scope !== scope) {
      return false;
    }

    if (scope === 'store') {
      return item.storeId === storeId;
    }

    return true;
  });
}

export function buildEnterpriseDepartmentTree(
  scope: EnterpriseDepartmentScope,
  storeId?: string,
  items: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
): EnterpriseDepartmentTreeNode[] {
  const scopedItems = getEnterpriseDepartmentItemsByScope(scope, storeId, items);
  const childrenMap = new Map<string | null, EnterpriseDepartmentItem[]>();

  scopedItems.forEach((item) => {
    const group = childrenMap.get(item.parentId) || [];
    group.push(item);
    childrenMap.set(item.parentId, group);
  });

  const buildNode = (item: EnterpriseDepartmentItem): EnterpriseDepartmentTreeNode => ({
    key: item.id,
    value: item.id,
    title: item.name,
    children: (childrenMap.get(item.id) || []).map(buildNode),
  });

  return (childrenMap.get(null) || []).map(buildNode);
}

export function useEnterpriseDepartmentItems() {
  const [items, setItems] = useState<EnterpriseDepartmentItem[]>(
    () => readEnterpriseDepartmentItems()
  );

  useEffect(() => {
    writePersistentValue(STORAGE_KEY, items);
    writeProductOwnershipItems(toProductOwnershipItems(items));
  }, [items]);

  return [items, setItems] as [
    EnterpriseDepartmentItem[],
    Dispatch<SetStateAction<EnterpriseDepartmentItem[]>>
  ];
}

export function normalizeEnterpriseDepartmentTab(
  value: unknown
): EnterpriseDepartmentScope {
  return normalizeEnterpriseDepartmentScope(value);
}

export function getEnterpriseDepartmentListPath(
  scope: EnterpriseDepartmentScope,
  storeId?: string
) {
  if (scope === 'store' && storeId) {
    return `/enterprise/department?tab=${scope}&storeId=${storeId}`;
  }

  return `/enterprise/department?tab=${scope}`;
}
