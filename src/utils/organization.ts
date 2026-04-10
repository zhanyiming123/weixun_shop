import {
  OrganizationItem,
  OrganizationType,
  readOrganizationItems,
} from '@/pages/enterprise/organization/data';
import {
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type OrganizationScope = 'headquarter' | 'region' | 'store';

export type CurrentOrganization = {
  id: string;
  scope: OrganizationScope;
  name: string;
  storeIds: string[];
  regionIds?: string[];
  regionId?: string;
};

export type OrganizationOption = CurrentOrganization & {
  label: string;
};

export type OrganizationTreeNode = {
  key: string;
  value: string;
  title: string;
  scope: OrganizationScope;
  children?: OrganizationTreeNode[];
};

const CURRENT_ORGANIZATION_STORAGE_KEY = 'current-organization-id';

export const HEADQUARTER_ORGANIZATION_ID = 'headquarter';

function normalizeStoreIds(
  storeIds: string[] = [],
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const availableStoreIds = new Set(storeItems.map((item) => item.id));
  const selectedIds = new Set(storeIds.filter((item) => availableStoreIds.has(item)));

  return storeItems
    .map((item) => item.id)
    .filter((item) => selectedIds.has(item));
}

export function normalizeOrganizationScope(
  value: OrganizationType | OrganizationScope | string | undefined
): OrganizationScope {
  if (value === 'store') {
    return 'store';
  }

  if (value === 'region' || value === 'partner') {
    return 'region';
  }

  return 'headquarter';
}

export function getOrganizationScopeLabel(scope: OrganizationScope) {
  switch (scope) {
    case 'region':
      return '区域';
    case 'store':
      return '门店';
    default:
      return '总部';
  }
}

function buildOrganizationLabel(name: string, scope: OrganizationScope) {
  if (scope === 'headquarter') {
    return name;
  }

  return `${name}（${getOrganizationScopeLabel(scope)}）`;
}

function buildOrganizationTreeTitle(name: string, scope: OrganizationScope) {
  if (scope === 'headquarter') {
    return name;
  }

  return `${name} · ${getOrganizationScopeLabel(scope)}`;
}

function inferOrganizationStoreIds(
  item: OrganizationItem,
  storeItems: ProductStoreItem[]
) {
  const selectedStoreIds = normalizeStoreIds(item.selectedStoreIds, storeItems);
  if (selectedStoreIds.length) {
    return item.type === 'store' ? selectedStoreIds.slice(0, 1) : selectedStoreIds;
  }

  const keywords = [item.name, item.regionLabel, ...item.regionPath]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!keywords.length) {
    return [];
  }

  const matchedStoreIds = storeItems
    .filter((storeItem) => {
      const targetText = `${storeItem.name} ${storeItem.address}`.toLowerCase();
      return keywords.some((keyword) => targetText.includes(keyword));
    })
    .map((storeItem) => storeItem.id);

  if (item.type === 'store') {
    return matchedStoreIds.slice(0, 1);
  }

  return matchedStoreIds;
}

function toOrganizationOption(
  item: OrganizationItem,
  storeItems: ProductStoreItem[]
): OrganizationOption {
  const scope = normalizeOrganizationScope(item.type);
  const storeIds = inferOrganizationStoreIds(item, storeItems);

  return {
    id: item.id,
    scope,
    name: item.name,
    label: buildOrganizationLabel(item.name, scope),
    storeIds,
    regionId: scope === 'region' ? item.id : undefined,
    regionIds: scope === 'region' ? [item.id] : undefined,
  };
}

export function buildHeadquarterOrganization(
  storeItems: ProductStoreItem[] = readProductStoreItems()
): OrganizationOption {
  return {
    id: HEADQUARTER_ORGANIZATION_ID,
    scope: 'headquarter',
    name: '总部',
    label: buildOrganizationLabel('总部', 'headquarter'),
    storeIds: storeItems.map((item) => item.id),
    regionIds: [],
  };
}

export function buildCurrentOrganizationOptions() {
  const storeItems = readProductStoreItems();
  const organizationOptions = readOrganizationItems()
    .filter((item) => item.status === 'enabled')
    .map((item) => toOrganizationOption(item, storeItems));

  return [buildHeadquarterOrganization(storeItems), ...organizationOptions];
}

function buildOrganizationTreeNode(
  option: OrganizationOption,
  children: OrganizationTreeNode[] = []
): OrganizationTreeNode {
  return {
    key: option.id,
    value: option.id,
    title: buildOrganizationTreeTitle(option.name, option.scope),
    scope: option.scope,
    children,
  };
}

function isRegionPathPrefix(sourcePath: string[] = [], targetPath: string[] = []) {
  if (!sourcePath.length || sourcePath.length > targetPath.length) {
    return false;
  }

  return sourcePath.every((item, index) => targetPath[index] === item);
}

function getMatchedRegionId(
  storeItem: OrganizationItem,
  storeOption: OrganizationOption,
  regionEntries: Array<{
    item: OrganizationItem;
    option: OrganizationOption;
  }>
) {
  const matchedByRegionPath = regionEntries
    .filter(({ item }) => isRegionPathPrefix(item.regionPath, storeItem.regionPath))
    .sort((left, right) => right.item.regionPath.length - left.item.regionPath.length)[0];

  if (matchedByRegionPath) {
    return matchedByRegionPath.option.id;
  }

  const [storeId] = storeOption.storeIds;

  if (storeId) {
    const matchedByStore = regionEntries.find(({ option }) =>
      option.storeIds.includes(storeId)
    );

    if (matchedByStore) {
      return matchedByStore.option.id;
    }
  }

  return regionEntries.find(({ item }) =>
    isRegionPathPrefix(item.regionPath, storeItem.regionPath)
  )?.option.id;
}

export function buildCurrentOrganizationTree() {
  const storeItems = readProductStoreItems();
  const enabledItems = readOrganizationItems().filter(
    (item) => item.status === 'enabled'
  );
  const headquarter = buildHeadquarterOrganization(storeItems);
  const regionEntries = enabledItems
    .filter((item) => normalizeOrganizationScope(item.type) === 'region')
    .map((item) => ({
      item,
      option: toOrganizationOption(item, storeItems),
    }));
  const storeEntries = enabledItems
    .filter((item) => normalizeOrganizationScope(item.type) === 'store')
    .map((item) => ({
      item,
      option: toOrganizationOption(item, storeItems),
    }));

  const regionNodeMap = new Map<string, OrganizationTreeNode>();
  const headquarterChildren = regionEntries.map(({ option }) => {
    const node = buildOrganizationTreeNode(option);
    regionNodeMap.set(option.id, node);
    return node;
  });

  storeEntries.forEach(({ item, option }) => {
    const matchedRegionId = getMatchedRegionId(item, option, regionEntries);
    const matchedRegionNode = matchedRegionId && regionNodeMap.get(matchedRegionId);

    if (matchedRegionNode) {
      matchedRegionNode.children = [
        ...(matchedRegionNode.children || []),
        buildOrganizationTreeNode(option),
      ];
      return;
    }

    headquarterChildren.push(buildOrganizationTreeNode(option));
  });

  return [buildOrganizationTreeNode(headquarter, headquarterChildren)];
}

export function readCurrentOrganizationId() {
  return readPersistentValue<string>(
    CURRENT_ORGANIZATION_STORAGE_KEY,
    HEADQUARTER_ORGANIZATION_ID
  );
}

export function writeCurrentOrganizationId(id: string) {
  writePersistentValue(CURRENT_ORGANIZATION_STORAGE_KEY, id);
}

export function getCurrentOrganizationById(
  id = HEADQUARTER_ORGANIZATION_ID,
  options: OrganizationOption[] = buildCurrentOrganizationOptions()
) {
  return (
    options.find((item) => item.id === id) ||
    options.find((item) => item.id === HEADQUARTER_ORGANIZATION_ID) ||
    buildHeadquarterOrganization()
  );
}

export function readCurrentOrganization() {
  const options = buildCurrentOrganizationOptions();
  const currentOrganizationId = readCurrentOrganizationId();
  const currentOrganization = getCurrentOrganizationById(
    currentOrganizationId,
    options
  );

  if (currentOrganization.id !== currentOrganizationId) {
    writeCurrentOrganizationId(currentOrganization.id);
  }

  return currentOrganization;
}

export function hasStoreIntersection(
  sourceStoreIds: string[] = [],
  targetStoreIds: string[] = []
) {
  if (!targetStoreIds.length) {
    return false;
  }

  const targetStoreIdSet = new Set(targetStoreIds);
  return sourceStoreIds.some((storeId) => targetStoreIdSet.has(storeId));
}

export function filterStoreItemsByIds(
  storeItems: ProductStoreItem[],
  storeIds: string[]
) {
  if (!storeIds.length) {
    return [];
  }

  const visibleStoreIdSet = new Set(storeIds);
  return storeItems.filter((item) => visibleStoreIdSet.has(item.id));
}
