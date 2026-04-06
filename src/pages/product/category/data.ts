import usePersistentState, {
  readPersistentValue,
} from '@/utils/usePersistentState';

export type ProductOwnershipConfigItem = {
  id: string;
  name: string;
  parentId: string | null;
};

export type ProductOwnershipTreeNode = {
  id: string;
  label: string;
  children?: ProductOwnershipTreeNode[];
};

export type ProductOwnershipCascaderOption = {
  value: string;
  label: string;
  children?: ProductOwnershipCascaderOption[];
};

export type ProductOwnershipLeafItem = {
  id: string;
  label: string;
  labelPath: string[];
  path: string[];
};

const STORAGE_KEY = 'product-ownership-config-items-v2';

export const DEFAULT_PRODUCT_OWNERSHIP_ITEMS: ProductOwnershipConfigItem[] = [
  { id: 'dept_01', name: '青少', parentId: null },
  { id: 'system_01_01', name: '青少留学', parentId: 'dept_01' },
  { id: 'item_01_01_01', name: '低龄备考', parentId: 'system_01_01' },
  { id: 'item_01_01_02', name: '低龄留学申请', parentId: 'system_01_01' },
  { id: 'system_01_02', name: '青少语培', parentId: 'dept_01' },
  { id: 'item_01_02_01', name: '小托福', parentId: 'system_01_02' },
  { id: 'system_01_03', name: '青少竞赛', parentId: 'dept_01' },
  { id: 'item_01_03_01', name: 'AMC8', parentId: 'system_01_03' },
  { id: 'dept_02', name: '择校', parentId: null },
  { id: 'system_02_01', name: '择校备考', parentId: 'dept_02' },
  { id: 'item_02_01_01', name: '择校初升高', parentId: 'system_02_01' },
  { id: 'system_02_02', name: '择校语培', parentId: 'dept_02' },
  { id: 'item_02_02_01', name: '择校预备英语', parentId: 'system_02_02' },
  { id: 'dept_03', name: '橡沐', parentId: null },
  { id: 'system_03_01', name: '橡沐竞赛', parentId: 'dept_03' },
  { id: 'item_03_01_01', name: '橡沐高阶竞赛', parentId: 'system_03_01' },
  { id: 'item_03_01_02', name: '橡沐入门竞赛', parentId: 'system_03_01' },
  { id: 'item_03_01_03', name: '橡沐中阶竞赛', parentId: 'system_03_01' },
  { id: 'system_03_02', name: '橡沐留学', parentId: 'dept_03' },
  { id: 'item_03_02_01', name: '美国升学服务', parentId: 'system_03_02' },
  { id: 'system_03_03', name: '橡沐学科', parentId: 'dept_03' },
  { id: 'item_03_03_01', name: 'TOK展示', parentId: 'system_03_03' },
  { id: 'item_03_03_02', name: 'TOK展示加急', parentId: 'system_03_03' },
  { id: 'item_03_03_03', name: 'TOK论文套餐A', parentId: 'system_03_03' },
  { id: 'item_03_03_04', name: 'TOK论文套餐A加急', parentId: 'system_03_03' },
  { id: 'item_03_03_05', name: 'TOK论文套餐B', parentId: 'system_03_03' },
  { id: 'item_03_03_06', name: 'TOK论文套餐B加急', parentId: 'system_03_03' },
  { id: 'item_03_03_07', name: '美高同步', parentId: 'system_03_03' },
  { id: 'item_03_03_08', name: '美高同步-高阶课程', parentId: 'system_03_03' },
  { id: 'system_03_04', name: '橡沐语培', parentId: 'dept_03' },
  { id: 'item_03_04_01', name: '托福教辅', parentId: 'system_03_04' },
  { id: 'item_03_04_02', name: '托福督学', parentId: 'system_03_04' },
  { id: 'dept_04', name: '全日制', parentId: null },
  { id: 'system_04_01', name: '全日制学科', parentId: 'dept_04' },
  { id: 'item_04_01_01', name: '全日制学科', parentId: 'system_04_01' },
  { id: 'item_04_01_02', name: '全日制学科高端', parentId: 'system_04_01' },
  { id: 'system_04_02', name: '全日制语培', parentId: 'dept_04' },
  { id: 'item_04_02_01', name: '全日制雅思', parentId: 'system_04_02' },
  { id: 'system_04_03', name: '全日制留学', parentId: 'dept_04' },
  { id: 'item_04_03_01', name: '全日制留学', parentId: 'system_04_03' },
  { id: 'dept_05', name: '高端', parentId: null },
  { id: 'system_05_01', name: '高端背提', parentId: 'dept_05' },
  { id: 'item_05_01_01', name: 'EAP', parentId: 'system_05_01' },
  { id: 'item_05_01_02', name: 'IC营', parentId: 'system_05_01' },
  { id: 'item_05_01_03', name: 'IPQ/EPQ', parentId: 'system_05_01' },
  { id: 'item_05_01_04', name: 'IPQ/EPQ修改', parentId: 'system_05_01' },
  { id: 'item_05_01_05', name: 'LSE营', parentId: 'system_05_01' },
  { id: 'item_05_01_06', name: '背景提升营', parentId: 'system_05_01' },
  { id: 'item_05_01_07', name: '大学先修课', parentId: 'system_05_01' },
  { id: 'item_05_01_08', name: '导读课程', parentId: 'system_05_01' },
  { id: 'item_05_01_09', name: '科研', parentId: 'system_05_01' },
  { id: 'item_05_01_10', name: '其他论文竞赛', parentId: 'system_05_01' },
  { id: 'item_05_01_11', name: '论文修改', parentId: 'system_05_01' },
  { id: 'item_05_01_12', name: '论文营', parentId: 'system_05_01' },
  { id: 'item_05_01_13', name: '专业路径探索营', parentId: 'system_05_01' },
  { id: 'item_05_01_14', name: 'JL论文竞赛', parentId: 'system_05_01' },
  { id: 'system_05_02', name: '高端竞赛', parentId: 'dept_05' },
  { id: 'item_05_02_01', name: '高阶竞赛', parentId: 'system_05_02' },
  { id: 'item_05_02_02', name: '入门竞赛', parentId: 'system_05_02' },
  { id: 'item_05_02_03', name: '中阶竞赛', parentId: 'system_05_02' },
  { id: 'item_05_02_04', name: 'AMC12', parentId: 'system_05_02' },
  { id: 'item_05_02_05', name: 'STEP', parentId: 'system_05_02' },
  { id: 'item_05_02_06', name: 'BPhO', parentId: 'system_05_02' },
  { id: 'item_05_02_07', name: 'BBO&USABO', parentId: 'system_05_02' },
  { id: 'item_05_02_08', name: 'UKChO', parentId: 'system_05_02' },
  { id: 'item_05_02_09', name: 'NEC初赛', parentId: 'system_05_02' },
  { id: 'item_05_02_10', name: 'AMC10', parentId: 'system_05_02' },
  { id: 'item_05_02_11', name: 'Euclid', parentId: 'system_05_02' },
  { id: 'item_05_02_12', name: 'BPhO IPC/SPC', parentId: 'system_05_02' },
  { id: 'system_05_03', name: '高端牛剑', parentId: 'dept_05' },
  { id: 'item_05_03_01', name: '高阶笔试', parentId: 'system_05_03' },
  { id: 'item_05_03_02', name: '遴选计划', parentId: 'system_05_03' },
  { id: 'item_05_03_03', name: '模拟面试非牛剑', parentId: 'system_05_03' },
  { id: 'item_05_03_04', name: '模拟面试牛剑', parentId: 'system_05_03' },
  { id: 'item_05_03_05', name: '牛剑VIP', parentId: 'system_05_03' },
  { id: 'item_05_03_06', name: '牛剑精英营', parentId: 'system_05_03' },
  { id: 'item_05_03_07', name: '中国香港面试', parentId: 'system_05_03' },
  { id: 'dept_06', name: '英联邦', parentId: null },
  { id: 'system_06_01', name: '英联邦留学', parentId: 'dept_06' },
  { id: 'item_06_01_01', name: '英联邦升学服务', parentId: 'system_06_01' },
  { id: 'system_06_02', name: '英联邦学科', parentId: 'dept_06' },
  { id: 'item_06_02_01', name: 'ALEVEL高端', parentId: 'system_06_02' },
  { id: 'system_06_03', name: '英联邦语培', parentId: 'dept_06' },
  { id: 'item_06_03_01', name: '雅思督学', parentId: 'system_06_03' },
  { id: 'item_06_03_02', name: '雅思教辅', parentId: 'system_06_03' },
  { id: 'dept_07', name: '英研', parentId: null },
  { id: 'system_07_01', name: '英研课程', parentId: 'dept_07' },
  { id: 'item_07_01_01', name: '英国大学课程', parentId: 'system_07_01' },
];

export function readProductOwnershipItems() {
  return readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_OWNERSHIP_ITEMS);
}

export function useProductOwnershipItems() {
  return usePersistentState(STORAGE_KEY, DEFAULT_PRODUCT_OWNERSHIP_ITEMS);
}

export function buildProductOwnershipTree(
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
): ProductOwnershipTreeNode[] {
  const childrenMap = new Map<string | null, ProductOwnershipConfigItem[]>();

  items.forEach((item) => {
    const key = item.parentId;
    const group = childrenMap.get(key) || [];
    group.push(item);
    childrenMap.set(key, group);
  });

  const buildNodes = (parentId: string | null): ProductOwnershipTreeNode[] =>
    (childrenMap.get(parentId) || []).map((item) => {
      const children = buildNodes(item.id);
      return {
        id: item.id,
        label: item.name,
        children: children.length ? children : undefined,
      };
    });

  return buildNodes(null);
}

function flattenProductOwnershipLeaves(
  nodes: ProductOwnershipTreeNode[],
  parentPath: string[] = [],
  parentLabelPath: string[] = []
): ProductOwnershipLeafItem[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.id];
    const labelPath = [...parentLabelPath, node.label];

    if (!node.children?.length) {
      return [
        {
          id: node.id,
          label: node.label,
          labelPath,
          path,
        },
      ];
    }

    return flattenProductOwnershipLeaves(node.children, path, labelPath);
  });
}

export function buildProductOwnershipLeafItems(
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  return flattenProductOwnershipLeaves(buildProductOwnershipTree(items));
}

function toProductOwnershipCascaderOptions(
  nodes: ProductOwnershipTreeNode[]
): ProductOwnershipCascaderOption[] {
  return nodes.map((node) => ({
    value: node.id,
    label: node.label,
    children: node.children?.length
      ? toProductOwnershipCascaderOptions(node.children)
      : undefined,
  }));
}

export function buildProductOwnershipCascaderOptions(
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  return toProductOwnershipCascaderOptions(buildProductOwnershipTree(items));
}

export function getProductOwnershipLeafById(
  id?: string,
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  if (!id) {
    return undefined;
  }

  return buildProductOwnershipLeafItems(items).find((item) => item.id === id);
}

export function getProductOwnershipPathById(
  id?: string,
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  return getProductOwnershipLeafById(id, items)?.path || [];
}

export function getProductOwnershipLabelPathById(
  id?: string,
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  return getProductOwnershipLeafById(id, items)?.labelPath || [];
}

export function getProductOwnershipFullLabel(
  id?: string,
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  return getProductOwnershipLabelPathById(id, items).join(' / ');
}

export function getProductOwnershipIdFromPath(
  path: string[],
  items: ProductOwnershipConfigItem[] = DEFAULT_PRODUCT_OWNERSHIP_ITEMS
) {
  if (!path.length) {
    return undefined;
  }

  return buildProductOwnershipLeafItems(items).find(
    (item) =>
      item.path.length === path.length &&
      item.path.every((value, index) => value === path[index])
  )?.id;
}
