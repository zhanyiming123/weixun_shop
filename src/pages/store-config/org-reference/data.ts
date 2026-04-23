import {
  EnterpriseDepartmentItem,
  EnterpriseDepartmentScope,
  getEnterpriseDepartmentItemsByScope,
  readEnterpriseDepartmentItems,
} from '@/pages/enterprise/department/data';
import {
  OrganizationItem,
  readOrganizationItems,
} from '@/pages/enterprise/organization/data';
import {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type HrEmployeeStatus = 'enabled' | 'disabled';

export type HrEmployeeItem = {
  id: string;
  name: string;
  account: string;
  contactPhone: string;
  departmentId: string;
  departmentPathLabels: string[];
  storeId?: string;
  isManagement: boolean;
  status: HrEmployeeStatus;
};

export type StoreOrgReferenceSubordinateRelation = {
  subjectEmployeeId: string;
  ownerEmployeeId: string;
};

export type StoreOrgReferenceConfig = {
  storeId: string;
  selectedDepartmentIds: string[];
  selectedEmployeeIds: string[];
  subordinateRelations: StoreOrgReferenceSubordinateRelation[];
  updatedAt: string;
};

export type StoreReferencedEmployeeItem = {
  id: string;
  name: string;
  account: string;
  contactPhone: string;
  isManagement: boolean;
  status: HrEmployeeStatus;
  sourceType: 'hr_reference' | 'external_import';
  sourceDepartmentPath: string[];
  readonly: true;
  ownerEmployeeIds: string[];
  ownerEmployeeNames: string[];
};

export type StoreOrgReferenceTreeNode = {
  key: string;
  title: string;
  nodeType: 'root' | 'department' | 'employee';
  children?: StoreOrgReferenceTreeNode[];
  disableCheckbox?: boolean;
  departmentId?: string;
  employeeId?: string;
  scope?: EnterpriseDepartmentScope;
  storeId?: string;
  pathLabels?: string[];
};

const STORAGE_KEY = 'store-org-reference-configs-v2';
const STORE_ORG_REFERENCE_DEFAULT_UPDATED_AT = '2026-04-20 10:00:00';
const DEPARTMENT_NODE_KEY_PREFIX = 'dept:';
const EMPLOYEE_NODE_KEY_PREFIX = 'emp:';

const HR_EMPLOYEE_NAME_POOL = [
  '林知夏',
  '周明远',
  '沈清和',
  '许安然',
  '唐闻溪',
  '顾星野',
  '程以宁',
  '梁景初',
  '苏听澜',
  '韩知序',
  '谢云舒',
  '宋南乔',
  '郑言之',
  '陆西洲',
  '冯屿川',
  '何念安',
];

function createCurrentDateTime() {
  return new Date()
    .toLocaleString('zh-CN', {
      hour12: false,
    })
    .replace(/\//g, '-');
}

function sanitizeDepartmentIds(selectedDepartmentIds: string[]) {
  return Array.from(
    new Set(
      selectedDepartmentIds.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    )
  );
}

function sanitizeEmployeeIds(
  selectedEmployeeIds: string[],
  validEmployeeIdSet?: Set<string>
) {
  const normalizedIds = selectedEmployeeIds.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );
  const uniqueIds = Array.from(new Set(normalizedIds));

  if (!validEmployeeIdSet) {
    return uniqueIds;
  }

  return uniqueIds.filter((item) => validEmployeeIdSet.has(item));
}

export function buildStoreOrgReferenceDepartmentNodeKey(departmentId: string) {
  return `${DEPARTMENT_NODE_KEY_PREFIX}${departmentId}`;
}

export function buildStoreOrgReferenceEmployeeNodeKey(employeeId: string) {
  return `${EMPLOYEE_NODE_KEY_PREFIX}${employeeId}`;
}

export function parseStoreOrgReferenceCheckedKeys(checkedKeys: string[]) {
  const selectedDepartmentIds = checkedKeys.flatMap((item) =>
    item.startsWith(DEPARTMENT_NODE_KEY_PREFIX)
      ? [item.slice(DEPARTMENT_NODE_KEY_PREFIX.length)]
      : []
  );
  const selectedEmployeeIds = checkedKeys.flatMap((item) =>
    item.startsWith(EMPLOYEE_NODE_KEY_PREFIX)
      ? [item.slice(EMPLOYEE_NODE_KEY_PREFIX.length)]
      : []
  );

  return {
    selectedDepartmentIds: sanitizeDepartmentIds(selectedDepartmentIds),
    selectedEmployeeIds: sanitizeEmployeeIds(selectedEmployeeIds),
  };
}

function flattenOrgReferenceTreeNodes(
  nodes: StoreOrgReferenceTreeNode[],
  accumulator = new Map<string, StoreOrgReferenceTreeNode>()
) {
  nodes.forEach((node) => {
    accumulator.set(node.key, node);
    if (node.children?.length) {
      flattenOrgReferenceTreeNodes(node.children, accumulator);
    }
  });

  return accumulator;
}

function collectDescendantDepartmentIds(
  node: StoreOrgReferenceTreeNode | undefined
): string[] {
  if (!node) {
    return [];
  }

  const currentNodeIds = node.departmentId ? [node.departmentId] : [];

  return [
    ...currentNodeIds,
    ...(node.children || []).flatMap((child) => collectDescendantDepartmentIds(child)),
  ];
}

function buildDepartmentChildrenMap(items: EnterpriseDepartmentItem[]) {
  const childrenMap = new Map<string | null, EnterpriseDepartmentItem[]>();

  items.forEach((item) => {
    const group = childrenMap.get(item.parentId) || [];
    group.push(item);
    childrenMap.set(item.parentId, group);
  });

  return childrenMap;
}

function buildDepartmentTreeNodes(
  scope: EnterpriseDepartmentScope,
  rootLabel: string,
  items: EnterpriseDepartmentItem[],
  storeId?: string
) {
  const scopedItems = getEnterpriseDepartmentItemsByScope(scope, storeId, items);
  const childrenMap = buildDepartmentChildrenMap(scopedItems);

  const buildNode = (
    item: EnterpriseDepartmentItem,
    parentPathLabels: string[]
  ): StoreOrgReferenceTreeNode => {
    const pathLabels = [...parentPathLabels, item.name];

    return {
      key: item.id,
      title: item.name,
      nodeType: 'department',
      departmentId: item.id,
      scope,
      storeId,
      pathLabels,
      children: (childrenMap.get(item.id) || []).map((child) =>
        buildNode(child, pathLabels)
      ),
    };
  };

  return (childrenMap.get(null) || []).map((item) => buildNode(item, [rootLabel]));
}

function buildStoreOrganizationEntries(
  organizationItems: OrganizationItem[] = readOrganizationItems()
) {
  const storeItems = organizationItems.filter(
    (item) => item.type === 'store' && item.status === 'enabled'
  );

  return storeItems.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

function collectStoreRootDepartmentIds(
  storeId: string,
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  return getEnterpriseDepartmentItemsByScope('store', storeId, departmentItems)
    .filter((item) => item.parentId === null)
    .map((item) => item.id);
}

export function buildStoreOrgReferenceTree(
  organizationItems: OrganizationItem[] = readOrganizationItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  const storeEntries = buildStoreOrganizationEntries(organizationItems);
  const headquarterNodes = buildDepartmentTreeNodes(
    'headquarter',
    '总部',
    departmentItems
  );
  const headquarterRoot: StoreOrgReferenceTreeNode = {
    key: 'org_reference_headquarter_root',
    title: '总部',
    nodeType: 'root',
    disableCheckbox: true,
    children: headquarterNodes,
  };
  const storeRootNodes = storeEntries.map<StoreOrgReferenceTreeNode>((storeEntry) => ({
    key: `org_reference_store_root_${storeEntry.id}`,
    title: storeEntry.name,
    nodeType: 'root',
    disableCheckbox: true,
    storeId: storeEntry.id,
    children: buildDepartmentTreeNodes(
      'store',
      storeEntry.name,
      departmentItems,
      storeEntry.id
    ),
  }));

  return [headquarterRoot, ...storeRootNodes];
}

export function buildStoreOrgReferenceSelectionTree(
  organizationItems: OrganizationItem[] = readOrganizationItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems(),
  hrEmployees: HrEmployeeItem[] = readHrEmployeeItems(departmentItems, organizationItems)
) {
  const departmentTree = buildStoreOrgReferenceTree(organizationItems, departmentItems);
  const employeeMap = new Map<string, HrEmployeeItem[]>();

  hrEmployees.forEach((employee) => {
    const currentItems = employeeMap.get(employee.departmentId) || [];
    currentItems.push(employee);
    employeeMap.set(employee.departmentId, currentItems);
  });

  const convertNode = (node: StoreOrgReferenceTreeNode): StoreOrgReferenceTreeNode => {
    if (node.nodeType === 'root') {
      return {
        ...node,
        children: (node.children || []).map((child) => convertNode(child)),
      };
    }

    if (!node.departmentId) {
      return node;
    }

    const departmentChildren = (node.children || []).map((child) => convertNode(child));
    const employeeChildren = (employeeMap.get(node.departmentId) || []).map(
      (employee): StoreOrgReferenceTreeNode => ({
        key: buildStoreOrgReferenceEmployeeNodeKey(employee.id),
        title: `${employee.name}（${employee.account}）`,
        nodeType: 'employee',
        employeeId: employee.id,
        departmentId: employee.departmentId,
        scope: node.scope,
        storeId: node.storeId,
        pathLabels: [...employee.departmentPathLabels, employee.name],
      })
    );

    return {
      ...node,
      key: buildStoreOrgReferenceDepartmentNodeKey(node.departmentId),
      nodeType: 'department',
      children: [...departmentChildren, ...employeeChildren],
    };
  };

  return departmentTree.map((node) => convertNode(node));
}

function buildDepartmentPathEntryMap(
  treeNodes: StoreOrgReferenceTreeNode[] = buildStoreOrgReferenceTree()
) {
  const nodeMap = flattenOrgReferenceTreeNodes(treeNodes);
  const departmentPathMap = new Map<string, string[]>();

  nodeMap.forEach((node) => {
    if (node.departmentId && node.pathLabels?.length) {
      departmentPathMap.set(node.departmentId, node.pathLabels);
    }
  });

  return departmentPathMap;
}

function formatHrEmployeePhone(seed: number) {
  return `13${String(700000000 + seed).padStart(9, '0').slice(0, 9)}`;
}

function formatHrEmployeeAccount(index: number, departmentId: string) {
  const safeDepartmentId = departmentId.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  return `hr.${safeDepartmentId}.${index + 1}@weixun.demo`;
}

export function readHrEmployeeItems(
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems(),
  organizationItems: OrganizationItem[] = readOrganizationItems()
) {
  const treeNodes = buildStoreOrgReferenceTree(organizationItems, departmentItems);
  const departmentPathMap = buildDepartmentPathEntryMap(treeNodes);

  return departmentItems.flatMap((item, index) => {
    const employeeCount = item.parentId ? 2 : 1;

    return Array.from({ length: employeeCount }, (_, employeeIndex): HrEmployeeItem => {
      const seedIndex = index * 2 + employeeIndex;
      const storeId = item.scope === 'store' ? item.storeId || undefined : undefined;
      const name = HR_EMPLOYEE_NAME_POOL[seedIndex % HR_EMPLOYEE_NAME_POOL.length];

      return {
        id: `hr_employee_${item.id}_${employeeIndex + 1}`,
        name,
        account: formatHrEmployeeAccount(employeeIndex, item.id),
        contactPhone: formatHrEmployeePhone(seedIndex + 1),
        departmentId: item.id,
        departmentPathLabels: departmentPathMap.get(item.id) || [item.name],
        storeId,
        isManagement: employeeIndex === 0,
        status: seedIndex % 7 === 0 ? 'disabled' : 'enabled',
      };
    });
  });
}

function createDefaultStoreOrgReferenceConfig(storeId: string): StoreOrgReferenceConfig {
  return {
    storeId,
    selectedDepartmentIds: [],
    selectedEmployeeIds: [],
    subordinateRelations: [],
    updatedAt: createCurrentDateTime(),
  };
}

function normalizeSubordinateRelations(
  subordinateRelations: StoreOrgReferenceSubordinateRelation[] = [],
  validEmployeeIdSet?: Set<string>
) {
  const relationKeySet = new Set<string>();

  return subordinateRelations.filter((item) => {
    if (
      !item ||
      typeof item.subjectEmployeeId !== 'string' ||
      typeof item.ownerEmployeeId !== 'string'
    ) {
      return false;
    }

    if (!item.subjectEmployeeId || !item.ownerEmployeeId) {
      return false;
    }

    if (item.subjectEmployeeId === item.ownerEmployeeId) {
      return false;
    }

    if (
      validEmployeeIdSet &&
      (!validEmployeeIdSet.has(item.subjectEmployeeId) ||
        !validEmployeeIdSet.has(item.ownerEmployeeId))
    ) {
      return false;
    }

    const relationKey = `${item.subjectEmployeeId}__${item.ownerEmployeeId}`;
    if (relationKeySet.has(relationKey)) {
      return false;
    }

    relationKeySet.add(relationKey);
    return true;
  });
}

function normalizeStoreOrgReferenceConfig(
  item: Partial<StoreOrgReferenceConfig>,
  allEmployeeIds: Set<string>,
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
): StoreOrgReferenceConfig {
  const storeId = typeof item.storeId === 'string' ? item.storeId : '';
  const fallbackValue = createDefaultStoreOrgReferenceConfig(storeId);
  const validDepartmentIdSet = new Set(
    storeId
      ? getEnterpriseDepartmentItemsByScope('store', storeId, departmentItems).map(
          (department) => department.id
        )
      : []
  );

  return {
    ...fallbackValue,
    ...item,
    storeId,
    selectedDepartmentIds: sanitizeDepartmentIds(item.selectedDepartmentIds || []).filter(
      (departmentId) => validDepartmentIdSet.has(departmentId)
    ),
    selectedEmployeeIds: sanitizeEmployeeIds(
      item.selectedEmployeeIds || [],
      allEmployeeIds
    ),
    subordinateRelations: normalizeSubordinateRelations(
      item.subordinateRelations || [],
      allEmployeeIds
    ),
    updatedAt: item.updatedAt || fallbackValue.updatedAt,
  };
}

function createDefaultStoreOrgReferenceConfigs(
  organizationItems: OrganizationItem[] = readOrganizationItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
): Partial<StoreOrgReferenceConfig>[] {
  return buildStoreOrganizationEntries(organizationItems).map((storeEntry) => ({
    storeId: storeEntry.id,
    selectedDepartmentIds: collectStoreRootDepartmentIds(
      storeEntry.id,
      departmentItems
    ),
    selectedEmployeeIds: [],
    subordinateRelations: [],
    updatedAt: STORE_ORG_REFERENCE_DEFAULT_UPDATED_AT,
  }));
}

export function readStoreOrgReferenceConfigs(
  hrEmployees: HrEmployeeItem[] = readHrEmployeeItems(),
  organizationItems: OrganizationItem[] = readOrganizationItems(),
  departmentItems: EnterpriseDepartmentItem[] = readEnterpriseDepartmentItems()
) {
  const raw = readPersistentValue<Partial<StoreOrgReferenceConfig>[] | null>(
    STORAGE_KEY,
    null
  );
  // null means storage key has never been written → use defaults
  const persistedItems: Partial<StoreOrgReferenceConfig>[] =
    Array.isArray(raw)
      ? raw
      : createDefaultStoreOrgReferenceConfigs(organizationItems, departmentItems);
  const allEmployeeIds = new Set(hrEmployees.map((item) => item.id));
  const normalizedItems = persistedItems
    .filter(
      (item): item is Partial<StoreOrgReferenceConfig> =>
        Boolean(item) && typeof item === 'object'
    )
    .map((item) =>
      normalizeStoreOrgReferenceConfig(item, allEmployeeIds, departmentItems)
    )
    .filter((item) => item.storeId);

  if (JSON.stringify(persistedItems) !== JSON.stringify(normalizedItems)) {
    writePersistentValue(STORAGE_KEY, normalizedItems);
  }

  return normalizedItems;
}

export function writeStoreOrgReferenceConfigs(items: StoreOrgReferenceConfig[]) {
  writePersistentValue(STORAGE_KEY, items);
}

export function getStoreOrgReferenceConfigByStoreId(
  storeId: string,
  items: StoreOrgReferenceConfig[] = readStoreOrgReferenceConfigs()
) {
  return items.find((item) => item.storeId === storeId);
}

export function expandSelectedDepartmentIds(
  selectedDepartmentIds: string[],
  treeNodes: StoreOrgReferenceTreeNode[] = buildStoreOrgReferenceTree()
) {
  const nodeMap = flattenOrgReferenceTreeNodes(treeNodes);
  const expandedDepartmentIdSet = new Set<string>();

  sanitizeDepartmentIds(selectedDepartmentIds).forEach((departmentId) => {
    collectDescendantDepartmentIds(nodeMap.get(departmentId)).forEach((item) =>
      expandedDepartmentIdSet.add(item)
    );
  });

  return Array.from(expandedDepartmentIdSet);
}

export function getReferencedHrEmployeesBySelection(
  selectedDepartmentIds: string[],
  hrEmployees: HrEmployeeItem[] = readHrEmployeeItems(),
  treeNodes: StoreOrgReferenceTreeNode[] = buildStoreOrgReferenceTree(),
  selectedEmployeeIds: string[] = []
) {
  const validDepartmentIdSet = new Set(
    expandSelectedDepartmentIds(selectedDepartmentIds, treeNodes)
  );
  const validEmployeeIdSet = new Set(
    sanitizeEmployeeIds(
      selectedEmployeeIds,
      new Set(hrEmployees.map((item) => item.id))
    )
  );

  return hrEmployees.filter(
    (item) =>
      validDepartmentIdSet.has(item.departmentId) || validEmployeeIdSet.has(item.id)
  );
}

export function sanitizeStoreOrgReferenceConfig(
  config: StoreOrgReferenceConfig,
  hrEmployees: HrEmployeeItem[] = readHrEmployeeItems(),
  treeNodes: StoreOrgReferenceTreeNode[] = buildStoreOrgReferenceTree()
) {
  const allEmployeeIds = new Set(hrEmployees.map((item) => item.id));
  const nodeMap = flattenOrgReferenceTreeNodes(treeNodes);
  const validDepartmentIdSet = new Set(
    Array.from(nodeMap.values()).flatMap((node) =>
      node.departmentId ? [node.departmentId] : []
    )
  );
  const selectedDepartmentIds = sanitizeDepartmentIds(config.selectedDepartmentIds).filter(
    (departmentId) => validDepartmentIdSet.has(departmentId)
  );
  const selectedEmployeeIds = sanitizeEmployeeIds(
    config.selectedEmployeeIds,
    allEmployeeIds
  );
  const referencedEmployeeIds = new Set(
    getReferencedHrEmployeesBySelection(
      selectedDepartmentIds,
      hrEmployees,
      treeNodes,
      selectedEmployeeIds
    ).map((item) => item.id)
  );

  return {
    ...config,
    selectedDepartmentIds,
    selectedEmployeeIds,
    subordinateRelations: normalizeSubordinateRelations(
      config.subordinateRelations,
      referencedEmployeeIds
    ),
  };
}

export function upsertStoreOrgReferenceConfig(
  nextItem: StoreOrgReferenceConfig,
  items: StoreOrgReferenceConfig[] = readStoreOrgReferenceConfigs(),
  hrEmployees: HrEmployeeItem[] = readHrEmployeeItems(),
  treeNodes: StoreOrgReferenceTreeNode[] = buildStoreOrgReferenceTree()
) {
  const sanitizedItem = {
    ...sanitizeStoreOrgReferenceConfig(nextItem, hrEmployees, treeNodes),
    updatedAt: createCurrentDateTime(),
  };

  const nextItems = items.some((item) => item.storeId === sanitizedItem.storeId)
    ? items.map((item) => (item.storeId === sanitizedItem.storeId ? sanitizedItem : item))
    : [...items, sanitizedItem];

  writeStoreOrgReferenceConfigs(nextItems);
  return nextItems;
}

export function buildStoreReferencedEmployees(
  storeId: string,
  config: StoreOrgReferenceConfig | undefined = getStoreOrgReferenceConfigByStoreId(storeId),
  hrEmployees: HrEmployeeItem[] = readHrEmployeeItems(),
  treeNodes: StoreOrgReferenceTreeNode[] = buildStoreOrgReferenceTree()
) {
  const effectiveConfig = sanitizeStoreOrgReferenceConfig(
    config || createDefaultStoreOrgReferenceConfig(storeId),
    hrEmployees,
    treeNodes
  );
  const referencedEmployees = getReferencedHrEmployeesBySelection(
    effectiveConfig.selectedDepartmentIds,
    hrEmployees,
    treeNodes,
    effectiveConfig.selectedEmployeeIds
  );
  const employeeNameMap = new Map(
    referencedEmployees.map((item) => [item.id, item.name] as const)
  );
  const ownerMap = new Map<string, string[]>();

  effectiveConfig.subordinateRelations.forEach((item) => {
    const owners = ownerMap.get(item.subjectEmployeeId) || [];
    owners.push(item.ownerEmployeeId);
    ownerMap.set(item.subjectEmployeeId, owners);
  });

  return referencedEmployees
    .map<StoreReferencedEmployeeItem>((item) => {
      const ownerEmployeeIds = Array.from(
        new Set((ownerMap.get(item.id) || []).filter((ownerId) => ownerId !== item.id))
      );

      return {
        id: item.id,
        name: item.name,
        account: item.account,
        contactPhone: item.contactPhone,
        isManagement: item.isManagement,
        status: item.status,
        sourceType: 'hr_reference',
        sourceDepartmentPath: item.departmentPathLabels,
        readonly: true,
        ownerEmployeeIds,
        ownerEmployeeNames: ownerEmployeeIds
          .map((ownerId) => employeeNameMap.get(ownerId))
          .filter((ownerName): ownerName is string => Boolean(ownerName)),
      };
    })
    .sort((left, right) => {
      const pathCompare = left.sourceDepartmentPath.join('/').localeCompare(
        right.sourceDepartmentPath.join('/'),
        'zh-CN'
      );

      if (pathCompare !== 0) {
        return pathCompare;
      }

      return left.name.localeCompare(right.name, 'zh-CN');
    });
}
