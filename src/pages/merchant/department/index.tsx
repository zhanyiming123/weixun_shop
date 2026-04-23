import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Link,
  Message,
  Modal,
  Pagination,
  Select,
  Table,
  Tree,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import {
  IconApps,
  IconDelete,
  IconDown,
  IconDragDotVertical,
  IconEdit,
  IconMoreVertical,
  IconPlus,
  IconRight,
  IconSearch,
} from '@arco-design/web-react/icon';
import styles from './index.module.less';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import { readDeptStoreAssignments, writeDeptStoreAssignments } from '@/utils/data-scope';

const RangePicker = DatePicker.RangePicker;
const Option = Select.Option;
const { useForm } = Form;

type MerchantDepartmentNode = {
  id: string;
  name: string;
  children?: MerchantDepartmentNode[];
};

type MerchantDepartmentMember = {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  departmentIds?: string[];
  departmentNames?: string[];
  storeIds: string[];
  role: string;
  phone: string;
  employeeCode: string;
  position: string;
};

type MerchantDepartmentOption = {
  value: string;
  label: string;
  fullLabel: string;
};

type MerchantDepartmentTreeSelectNode = {
  key: string;
  value: string;
  title: string;
  children?: MerchantDepartmentTreeSelectNode[];
};

type MemberFormValues = {
  name: string;
  phone: string;
  employeeCode: string;
  departmentIds?: unknown;
  storeIds?: string[];
  role: string;
};

type DepartmentFormValues = {
  name: string;
  parentId: string;
};

type ActiveMemberAction = {
  record: MerchantDepartmentMember;
  top: number;
  left: number;
};

type DataScopeTreeNode = {
  key: string;
  title: string;
  nodeType: 'department' | 'member';
  departmentId?: string;
  memberId?: string;
  children?: DataScopeTreeNode[];
};

const MERCHANT_COMPANY_NAME = '上海唯寻教育科技有限公司';
const ROOT_DEPARTMENT_ID = 'dept_root';
const MEMBER_ROLE_OPTIONS = ['超级管理员', '普通用户', '部门管理员'];
const IMPORT_DEFAULT_ROLE = '普通用户';
const MEMBER_MORE_CARD_WIDTH = 108;
const MEMBER_MORE_CARD_HEIGHT = 150;
const DATA_SCOPE_DEPARTMENT_KEY_PREFIX = 'data_scope_dept:';
const DATA_SCOPE_MEMBER_KEY_PREFIX = 'data_scope_member:';

const INITIAL_DEPARTMENT_TREE: MerchantDepartmentNode[] = [
  {
    id: ROOT_DEPARTMENT_ID,
    name: MERCHANT_COMPANY_NAME,
    children: [
      {
        id: 'dept_north',
        name: '唯寻华北',
        children: [
          { id: 'dept_north_language', name: '语培项目中心' },
          { id: 'dept_north_art', name: '美本项目中心' },
          { id: 'dept_north_overseas', name: '海淀运营中心' },
          { id: 'dept_north_trade', name: '国贸运营中心' },
          { id: 'dept_north_future', name: '唯寻未来学院' },
          { id: 'dept_north_planning', name: '升学规划中心' },
          { id: 'dept_north_marketing', name: '市场运营中心' },
        ],
      },
      {
        id: 'dept_shanghai',
        name: '唯寻上海',
        children: [
          { id: 'dept_shanghai_study', name: '留学中心' },
          {
            id: 'dept_shanghai_future',
            name: '唯寻未来学院',
            children: [
              { id: 'dept_shanghai_future_planning', name: '升学规划部' },
              { id: 'dept_shanghai_future_service', name: '学员服务部' },
              { id: 'dept_shanghai_future_teaching', name: '教学部' },
            ],
          },
          {
            id: 'dept_shanghai_master',
            name: '英硕项目中心',
            children: [
              { id: 'dept_shanghai_master_sales', name: '销售部' },
              { id: 'dept_shanghai_master_planning', name: '升学规划部' },
              { id: 'dept_shanghai_master_marketing', name: '市场运营部' },
              { id: 'dept_shanghai_master_teaching', name: '教学部' },
              { id: 'dept_shanghai_master_service', name: '学员服务部' },
            ],
          },
          {
            id: 'dept_shanghai_pudong_1',
            name: '英联邦浦西中心',
            children: [
              { id: 'dept_shanghai_puxi_1v1', name: '1V1 教学部' },
              { id: 'dept_shanghai_puxi_class', name: '班课教学部' },
              { id: 'dept_shanghai_puxi_service', name: '学员服务部' },
              { id: 'dept_shanghai_puxi_sales', name: '销售部' },
            ],
          },
          {
            id: 'dept_shanghai_young',
            name: '青少项目中心',
            children: [
              { id: 'dept_shanghai_young_sales', name: '销售部' },
              {
                id: 'dept_shanghai_young_biz',
                name: '商务部（项目合作部）',
              },
              { id: 'dept_shanghai_young_marketing', name: '市场运营部' },
              { id: 'dept_shanghai_young_teaching', name: '教学部' },
              { id: 'dept_shanghai_young_service', name: '学员服务部' },
            ],
          },
          {
            id: 'dept_shanghai_highend',
            name: '高端项目中心',
            children: [
              { id: 'dept_shanghai_highend_product', name: '产品部' },
              { id: 'dept_shanghai_highend_camp', name: '营地运营部' },
              { id: 'dept_shanghai_highend_faculty', name: '师资运营部' },
              { id: 'dept_shanghai_highend_research', name: '教学教研部' },
            ],
          },
          { id: 'dept_shanghai_oxbridge', name: '橡沐中心' },
          {
            id: 'dept_shanghai_school',
            name: '择校项目中心',
            children: [
              { id: 'dept_shanghai_school_marketing', name: '市场运营部' },
              { id: 'dept_shanghai_school_sales', name: '销售部' },
              { id: 'dept_shanghai_school_teaching', name: '教学部' },
              { id: 'dept_shanghai_school_service', name: '学员服务部' },
              { id: 'dept_shanghai_school_product', name: '产品部' },
            ],
          },
          {
            id: 'dept_shanghai_pudong_2',
            name: '英联邦浦东中心',
            children: [
              { id: 'dept_shanghai_pudong_sales', name: '销售部' },
              { id: 'dept_shanghai_pudong_service', name: '学员服务部' },
              { id: 'dept_shanghai_pudong_teaching', name: '教学部' },
              { id: 'dept_shanghai_pudong_planning', name: '升学规划部' },
            ],
          },
          {
            id: 'dept_shanghai_language',
            name: '语培项目中心',
            children: [
              { id: 'dept_shanghai_language_oxbridge', name: '橡沐教学部' },
              {
                id: 'dept_shanghai_language_commonwealth',
                name: '英联邦教学部',
              },
            ],
          },
          { id: 'dept_group_center', name: '集团中心' },
        ],
      },
      {
        id: 'dept_south',
        name: '唯寻华南',
        children: [
          { id: 'dept_guangzhou', name: '唯寻广州' },
          { id: 'dept_shenzhen', name: '唯寻深圳' },
        ],
      },
      {
        id: 'dept_jiangsu',
        name: '唯寻江苏',
        children: [{ id: 'dept_suzhou', name: '唯寻苏州' }],
      },
      {
        id: 'dept_west',
        name: '唯寻西部',
        children: [
          { id: 'dept_xian', name: '唯寻西安' },
          { id: 'dept_chengdu', name: '唯寻成都' },
        ],
      },
      {
        id: 'dept_uk',
        name: '唯寻英国',
      },
      { id: 'dept_uk_service', name: '166287...' },
    ],
  },
];

const MEMBER_ITEMS: MerchantDepartmentMember[] = [
  {
    id: 'member_01',
    name: '超级管理员',
    departmentId: ROOT_DEPARTMENT_ID,
    departmentName: MERCHANT_COMPANY_NAME,
    storeIds: [],
    role: '超级管理员',
    phone: '18521033203',
    employeeCode: 'WX0001',
    position: '-',
  },
  {
    id: 'member_02',
    name: '测试1',
    departmentId: 'dept_group_center',
    departmentName: MERCHANT_COMPANY_NAME,
    storeIds: [],
    role: '普通用户',
    phone: '13671696745',
    employeeCode: 'WX0002',
    position: '-',
  },
  {
    id: 'member_03',
    name: '倪苗苗',
    departmentId: 'dept_shanghai_study',
    departmentName: '留学中心',
    storeIds: [],
    role: '普通用户',
    phone: '15055723155',
    employeeCode: 'WX0003',
    position: '客户关系专员',
  },
  {
    id: 'member_04',
    name: '王斐曼',
    departmentId: 'dept_shanghai_future',
    departmentName: '唯寻未来学院',
    storeIds: [],
    role: '普通用户',
    phone: '17856133527',
    employeeCode: 'WX0004',
    position: '产品经理',
  },
  {
    id: 'member_05',
    name: '胡俊',
    departmentId: 'dept_north_language',
    departmentName: '语培项目中心',
    storeIds: [],
    role: '普通用户',
    phone: '17521159217',
    employeeCode: 'WX0005',
    position: '服务主管',
  },
  {
    id: 'member_06',
    name: '黄静远',
    departmentId: 'dept_uk',
    departmentName: '唯寻英国',
    storeIds: [],
    role: '普通用户',
    phone: '13487092016',
    employeeCode: 'WX0006',
    position: '分公司总经理',
  },
  {
    id: 'member_07',
    name: '申梦辰',
    departmentId: 'dept_shanghai_master',
    departmentName: '英硕项目中心',
    storeIds: [],
    role: '普通用户',
    phone: '18500833930',
    employeeCode: 'WX0007',
    position: '高级业务拓展专员',
  },
  {
    id: 'member_08',
    name: '刘舒婷',
    departmentId: 'dept_north_marketing',
    departmentName: '市场运营中心',
    storeIds: [],
    role: '普通用户',
    phone: '13816462845',
    employeeCode: 'WX0008',
    position: '网络营销专员',
  },
  {
    id: 'member_09',
    name: '刘晓洁',
    departmentId: 'dept_shanghai_young',
    departmentName: '青少项目中心',
    storeIds: [],
    role: '普通用户',
    phone: '18701108376',
    employeeCode: 'WX0009',
    position: '服务主管',
  },
  {
    id: 'member_10',
    name: '何忆雯',
    departmentId: 'dept_uk_service',
    departmentName: '后端质检部',
    storeIds: [],
    role: '普通用户',
    phone: '13795425097',
    employeeCode: 'WX0010',
    position: '质检专员',
  },
  {
    id: 'member_11',
    name: '刘承伶',
    departmentId: 'dept_north_planning',
    departmentName: '升学规划中心',
    storeIds: [],
    role: '普通用户',
    phone: '17347912991',
    employeeCode: 'WX0011',
    position: '高级升学规划师',
  },
];

function normalizeStringArray(value: unknown) {
  return Array.from(
    new Set(
      Array.isArray(value)
        ? value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        : []
    )
  );
}

function normalizeTreeSelectValueArray(value: unknown) {
  if (!Array.isArray(value)) {
    return typeof value === 'string' && value.trim() ? [value.trim()] : [];
  }

  return Array.from(
    new Set(
      value.flatMap((item) => {
        if (typeof item === 'string') {
          const normalized = item.trim();
          return normalized ? [normalized] : [];
        }

        if (
          item &&
          typeof item === 'object' &&
          'value' in item &&
          typeof (item as { value?: unknown }).value === 'string'
        ) {
          const normalized = (item as { value: string }).value.trim();
          return normalized ? [normalized] : [];
        }

        return [];
      })
    )
  );
}

function showPendingMessage(actionText: string) {
  Message.info(`${actionText}功能待接入`);
}

function findDepartmentNode(
  nodes: MerchantDepartmentNode[],
  id: string
): MerchantDepartmentNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const matchedNode = findDepartmentNode(node.children || [], id);
    if (matchedNode) {
      return matchedNode;
    }
  }

  return undefined;
}

function collectDepartmentIds(node: MerchantDepartmentNode): string[] {
  return [
    node.id,
    ...(node.children || []).flatMap((child) => collectDepartmentIds(child)),
  ];
}

function flattenDepartmentOptions(
  nodes: MerchantDepartmentNode[],
  parentLabels: string[] = []
): MerchantDepartmentOption[] {
  return nodes.flatMap((node) => {
    const currentLabels = [...parentLabels, node.name];

    return [
      {
        value: node.id,
        label: node.name,
        fullLabel: currentLabels.join(' / '),
      },
      ...flattenDepartmentOptions(node.children || [], currentLabels),
    ];
  });
}

function filterDepartmentTree(
  nodes: MerchantDepartmentNode[],
  keyword: string
): MerchantDepartmentNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const children = filterDepartmentTree(
      node.children || [],
      normalizedKeyword
    );
    const matched = node.name.toLowerCase().includes(normalizedKeyword);

    if (!matched && !children.length) {
      return [];
    }

    return [
      {
        ...node,
        children: children.length ? children : undefined,
      },
    ];
  });
}

function createMemberId() {
  return `member_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDepartmentId() {
  return `dept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildDataScopeDepartmentNodeKey(departmentId: string) {
  return `${DATA_SCOPE_DEPARTMENT_KEY_PREFIX}${departmentId}`;
}

function buildDataScopeMemberNodeKey(memberId: string) {
  return `${DATA_SCOPE_MEMBER_KEY_PREFIX}${memberId}`;
}

function parseDataScopeCheckedKeys(checkedKeys: string[]) {
  const selectedDepartmentIds = checkedKeys.flatMap((item) =>
    item.startsWith(DATA_SCOPE_DEPARTMENT_KEY_PREFIX)
      ? [item.slice(DATA_SCOPE_DEPARTMENT_KEY_PREFIX.length)]
      : []
  );
  const selectedMemberIds = checkedKeys.flatMap((item) =>
    item.startsWith(DATA_SCOPE_MEMBER_KEY_PREFIX)
      ? [item.slice(DATA_SCOPE_MEMBER_KEY_PREFIX.length)]
      : []
  );

  return {
    selectedDepartmentIds: Array.from(new Set(selectedDepartmentIds)),
    selectedMemberIds: Array.from(new Set(selectedMemberIds)),
  };
}

function normalizeCheckedKeys(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { checked?: unknown }).checked)
  ) {
    return (value as { checked: unknown[] }).checked.filter(
      (item): item is string => typeof item === 'string'
    );
  }

  return [];
}

function collectDataScopeNodeKeys(nodes: DataScopeTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    node.key,
    ...(node.children?.length ? collectDataScopeNodeKeys(node.children) : []),
  ]);
}

function collectDataScopeExpandedKeys(nodes: DataScopeTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.nodeType === 'department' ? [node.key] : []),
    ...(node.children?.length ? collectDataScopeExpandedKeys(node.children) : []),
  ]);
}

function filterDataScopeTree(
  nodes: DataScopeTreeNode[],
  keyword: string
): DataScopeTreeNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const matched = node.title.toLowerCase().includes(normalizedKeyword);
    const children = filterDataScopeTree(node.children || [], normalizedKeyword);

    if (!matched && !children.length) {
      return [];
    }

    if (matched) {
      return [node];
    }

    return [
      {
        ...node,
        children,
      },
    ];
  });
}

function pickDataScopeSelectedSummaryTree(
  nodes: DataScopeTreeNode[],
  selectedMemberIdSet: Set<string>
): DataScopeTreeNode[] {
  return nodes.flatMap((node) => {
    if (node.nodeType === 'member') {
      return node.memberId && selectedMemberIdSet.has(node.memberId) ? [node] : [];
    }

    const children = pickDataScopeSelectedSummaryTree(
      node.children || [],
      selectedMemberIdSet
    );

    return children.length
      ? [
          {
            ...node,
            children,
          },
        ]
      : [];
  });
}

function appendDepartmentChild(
  nodes: MerchantDepartmentNode[],
  parentId: string,
  nextChild: MerchantDepartmentNode
) {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), nextChild],
      };
    }

    if (node.children?.length) {
      return {
        ...node,
        children: appendDepartmentChild(node.children, parentId, nextChild),
      };
    }

    return node;
  });
}

function toDepartmentTreeSelectData(
  nodes: MerchantDepartmentNode[]
): MerchantDepartmentTreeSelectNode[] {
  return nodes.map((node) => ({
    key: node.id,
    value: node.id,
    title: node.name,
    children: node.children?.length
      ? toDepartmentTreeSelectData(node.children)
      : undefined,
  }));
}

function collectDepartmentTreeKeys(nodes: MerchantDepartmentNode[]): string[] {
  return nodes.flatMap((node) => [
    node.id,
    ...(node.children?.length ? collectDepartmentTreeKeys(node.children) : []),
  ]);
}

function MerchantDepartmentPage() {
  const [departmentTree, setDepartmentTree] = useState<MerchantDepartmentNode[]>(
    () => INITIAL_DEPARTMENT_TREE
  );
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState<
    Set<string>
  >(
    () =>
      new Set([
        ROOT_DEPARTMENT_ID,
        'dept_north',
        'dept_shanghai',
        'dept_south',
        'dept_jiangsu',
        'dept_west',
      ])
  );
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState(ROOT_DEPARTMENT_ID);
  const [departmentKeyword, setDepartmentKeyword] = useState('');
  const [actionDepartmentId, setActionDepartmentId] = useState<string | null>(
    null
  );
  const [activeMemberAction, setActiveMemberAction] =
    useState<ActiveMemberAction | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [memberItems, setMemberItems] =
    useState<MerchantDepartmentMember[]>(MEMBER_ITEMS);
  const [editingMember, setEditingMember] =
    useState<MerchantDepartmentMember | null>(null);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [departmentForm] = useForm();
  const [memberForm] = useForm();
  const [dataScopeDrawerVisible, setDataScopeDrawerVisible] = useState(false);
  const [dataScopeTargetMember, setDataScopeTargetMember] =
    useState<MerchantDepartmentMember | null>(null);
  const [dataScopeKeyword, setDataScopeKeyword] = useState('');
  const [dataScopeCheckedKeys, setDataScopeCheckedKeys] = useState<string[]>([]);
  const [memberDataScopeCheckedKeyMap, setMemberDataScopeCheckedKeyMap] =
    useState<Record<string, string[]>>({});
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importForm] = useForm();

  const storeItems = useMemo(() => readProductStoreItems(), []);
  const validStoreIdSet = useMemo(
    () => new Set(storeItems.map((item) => item.id)),
    [storeItems]
  );
  const storeIdNameMap = useMemo(
    () => new Map(storeItems.map((item) => [item.id, item.name] as const)),
    [storeItems]
  );
  const [storeAssignTarget, setStoreAssignTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [storeAssignSelectedIds, setStoreAssignSelectedIds] = useState<string[]>([]);
  const [storeAssignments, setStoreAssignments] = useState<Record<string, string[]>>(
    () => readDeptStoreAssignments()
  );

  const filteredTree = useMemo(
    () => filterDepartmentTree(departmentTree, departmentKeyword),
    [departmentKeyword, departmentTree]
  );

  const departmentOptions = useMemo(
    () => flattenDepartmentOptions(departmentTree),
    [departmentTree]
  );
  const departmentLabelMap = useMemo(
    () => new Map(departmentOptions.map((option) => [option.value, option.label] as const)),
    [departmentOptions]
  );
  const departmentTreeSelectData = useMemo(
    () => toDepartmentTreeSelectData(departmentTree),
    [departmentTree]
  );
  const departmentTreeExpandedKeys = useMemo(
    () => collectDepartmentTreeKeys(departmentTree),
    [departmentTree]
  );
  const departmentPathIdMap = useMemo(() => {
    const pathMap = new Map<string, string[]>();

    function collectNodePathIds(
      nodes: MerchantDepartmentNode[],
      parentPathIds: string[] = []
    ) {
      nodes.forEach((node) => {
        const currentPathIds = [...parentPathIds, node.id];
        pathMap.set(node.id, currentPathIds);

        if (node.children?.length) {
          collectNodePathIds(node.children, currentPathIds);
        }
      });
    }

    collectNodePathIds(departmentTree);

    return pathMap;
  }, [departmentTree]);

  const selectedDepartment = useMemo(
    () => findDepartmentNode(departmentTree, selectedDepartmentId),
    [departmentTree, selectedDepartmentId]
  );
  const memberPrimaryDepartmentMap = useMemo(() => {
    const departmentMemberMap = new Map<string, MerchantDepartmentMember[]>();

    memberItems.forEach((member) => {
      const primaryDepartmentId = getMemberDepartmentIds(member)[0] || member.departmentId;
      const currentMembers = departmentMemberMap.get(primaryDepartmentId) || [];
      currentMembers.push(member);
      departmentMemberMap.set(primaryDepartmentId, currentMembers);
    });

    departmentMemberMap.forEach((items) => {
      items.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
    });

    return departmentMemberMap;
  }, [memberItems]);
  const dataScopeTreeData = useMemo(() => {
    const buildNodes = (nodes: MerchantDepartmentNode[]): DataScopeTreeNode[] =>
      nodes.map((node) => {
        const childDepartmentNodes = buildNodes(node.children || []);
        const childMemberNodes = (memberPrimaryDepartmentMap.get(node.id) || []).map(
          (member): DataScopeTreeNode => ({
            key: buildDataScopeMemberNodeKey(member.id),
            title: `${member.name}（${member.position || '-'} / ${member.role}）`,
            nodeType: 'member',
            memberId: member.id,
            departmentId: node.id,
          })
        );

        return {
          key: buildDataScopeDepartmentNodeKey(node.id),
          title: node.name,
          nodeType: 'department',
          departmentId: node.id,
          children: [...childDepartmentNodes, ...childMemberNodes],
        };
      });

    return buildNodes(departmentTree);
  }, [departmentTree, memberPrimaryDepartmentMap]);
  const dataScopeNodeKeySet = useMemo(
    () => new Set(collectDataScopeNodeKeys(dataScopeTreeData)),
    [dataScopeTreeData]
  );
  const filteredDataScopeTree = useMemo(
    () => filterDataScopeTree(dataScopeTreeData, dataScopeKeyword),
    [dataScopeKeyword, dataScopeTreeData]
  );
  const filteredDataScopeExpandedKeys = useMemo(
    () => collectDataScopeExpandedKeys(filteredDataScopeTree),
    [filteredDataScopeTree]
  );
  const dataScopeSelection = useMemo(
    () => parseDataScopeCheckedKeys(dataScopeCheckedKeys),
    [dataScopeCheckedKeys]
  );
  const dataScopeEffectiveMemberIdSet = useMemo(() => {
    const selectedDepartmentIdSet = new Set<string>();

    dataScopeSelection.selectedDepartmentIds.forEach((departmentId) => {
      const currentNode = findDepartmentNode(departmentTree, departmentId);
      if (!currentNode) {
        return;
      }

      collectDepartmentIds(currentNode).forEach((item) => selectedDepartmentIdSet.add(item));
    });

    const selectedMemberIdSet = new Set(dataScopeSelection.selectedMemberIds);
    memberItems.forEach((member) => {
      const primaryDepartmentId = getMemberDepartmentIds(member)[0] || member.departmentId;

      if (selectedDepartmentIdSet.has(primaryDepartmentId)) {
        selectedMemberIdSet.add(member.id);
      }
    });

    return selectedMemberIdSet;
  }, [dataScopeSelection, departmentTree, memberItems]);
  const dataScopeSummaryTreeData = useMemo(
    () =>
      pickDataScopeSelectedSummaryTree(dataScopeTreeData, dataScopeEffectiveMemberIdSet),
    [dataScopeEffectiveMemberIdSet, dataScopeTreeData]
  );
  const dataScopeSummaryExpandedKeys = useMemo(
    () => collectDataScopeExpandedKeys(dataScopeSummaryTreeData),
    [dataScopeSummaryTreeData]
  );
  const dataScopeTargetDepartmentPath = useMemo(() => {
    if (!dataScopeTargetMember) {
      return '-';
    }

    const primaryDepartmentId =
      getMemberDepartmentIds(dataScopeTargetMember)[0] || dataScopeTargetMember.departmentId;
    const pathIds = departmentPathIdMap.get(primaryDepartmentId) || [primaryDepartmentId];

    return pathIds
      .map((departmentId) => departmentLabelMap.get(departmentId) || departmentId)
      .join(' / ');
  }, [dataScopeTargetMember, departmentPathIdMap, departmentLabelMap]);

  const tableData = useMemo(() => {
    if (!selectedDepartment) {
      return memberItems;
    }

    if (selectedDepartment.id === ROOT_DEPARTMENT_ID) {
      return memberItems;
    }

    const availableDepartmentIds = new Set(
      collectDepartmentIds(selectedDepartment)
    );

    return memberItems.filter((member) =>
      getMemberDepartmentIds(member).some((departmentId) =>
        availableDepartmentIds.has(departmentId)
      )
    );
  }, [memberItems, selectedDepartment]);

  const currentPageMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return tableData.slice(start, start + pageSize);
  }, [currentPage, pageSize, tableData]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }, [selectedDepartmentId]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, pageSize, tableData.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function closeActionCards() {
      setActionDepartmentId(null);
      setActiveMemberAction(null);
    }

    document.addEventListener('click', closeActionCards);

    return () => {
      document.removeEventListener('click', closeActionCards);
    };
  }, []);

  function toggleExpand(id: string) {
    setExpandedDepartmentIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function handleDepartmentAction(
    event: React.MouseEvent,
    actionText: string,
    nodeName: string
  ) {
    event.stopPropagation();
    setActionDepartmentId(null);
    showPendingMessage(`${actionText}「${nodeName}」`);
  }

  function closeDepartmentModal() {
    setDepartmentModalVisible(false);
    departmentForm.resetFields();
  }

  function openCreateDepartmentModal(parentId: string = selectedDepartmentId) {
    const hasParent = Boolean(findDepartmentNode(departmentTree, parentId));
    const nextParentId = hasParent ? parentId : ROOT_DEPARTMENT_ID;

    setActionDepartmentId(null);
    departmentForm.resetFields();
    departmentForm.setFieldsValue({
      name: '',
      parentId: nextParentId,
    });
    setDepartmentModalVisible(true);
  }

  function handleMemberMoreAction(
    event: React.MouseEvent,
    actionText: string,
    record: MerchantDepartmentMember
  ) {
    event.stopPropagation();
    setActiveMemberAction(null);

    if (actionText === '数据从属') {
      openDataScopeDrawer(record);
      return;
    }

    showPendingMessage(`员工「${record.name}」${actionText}`);
  }

  function toggleMemberMoreCard(
    event: React.MouseEvent<HTMLElement>,
    record: MerchantDepartmentMember
  ) {
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const left = Math.min(
      Math.max(12, rect.right - MEMBER_MORE_CARD_WIDTH),
      window.innerWidth - MEMBER_MORE_CARD_WIDTH - 12
    );
    const top = Math.min(
      Math.max(12, rect.bottom + 8),
      window.innerHeight - MEMBER_MORE_CARD_HEIGHT - 12
    );

    setActiveMemberAction((current) =>
      current?.record.id === record.id ? null : { record, top, left }
    );
  }

  function closeMemberModal() {
    setMemberModalVisible(false);
    setEditingMember(null);
    memberForm.resetFields();
  }

  function openImportModal() {
    importForm.resetFields();
    importForm.setFieldsValue({ role: IMPORT_DEFAULT_ROLE });
    setImportModalVisible(true);
  }

  function closeImportModal() {
    setImportModalVisible(false);
    importForm.resetFields();
  }

  async function handleImportModalOk() {
    try {
      const values = await importForm.validate();
      const role = String(values.role || IMPORT_DEFAULT_ROLE).trim();
      const departmentStoreBinding = getDepartmentStoreBinding(selectedDepartmentId);
      const nextEmployeeCode = memberItems.length + 1;
      const importedMembers: MerchantDepartmentMember[] = [
        { id: createMemberId(), name: '张华', phone: '13800001111', employeeCode: `WX${String(nextEmployeeCode).padStart(4, '0')}`, departmentId: selectedDepartmentId, departmentName: selectedDepartment?.name || '', storeIds: departmentStoreBinding.storeIds, role, position: '-' },
        { id: createMemberId(), name: '李敏', phone: '13800002222', employeeCode: `WX${String(nextEmployeeCode + 1).padStart(4, '0')}`, departmentId: selectedDepartmentId, departmentName: selectedDepartment?.name || '', storeIds: departmentStoreBinding.storeIds, role, position: '-' },
        { id: createMemberId(), name: '王磊', phone: '13800003333', employeeCode: `WX${String(nextEmployeeCode + 2).padStart(4, '0')}`, departmentId: selectedDepartmentId, departmentName: selectedDepartment?.name || '', storeIds: departmentStoreBinding.storeIds, role, position: '-' },
      ];
      setMemberItems((prev) => [...prev, ...importedMembers]);
      Message.success(`已导入 ${importedMembers.length} 名员工，默认角色：${role}`);
      closeImportModal();
    } catch (_) {
      // validation error
    }
  }

  function openStoreAssignModal(
    node: MerchantDepartmentNode,
    event?: React.MouseEvent
  ) {
    event?.stopPropagation();
    setActionDepartmentId(null);
    setStoreAssignTarget({ id: node.id, name: node.name });
    setStoreAssignSelectedIds(getDepartmentStoreBinding(node.id).storeIds);
  }

  function closeDataScopeDrawer() {
    setDataScopeDrawerVisible(false);
    setDataScopeTargetMember(null);
    setDataScopeKeyword('');
    setDataScopeCheckedKeys([]);
  }

  function openDataScopeDrawer(record: MerchantDepartmentMember) {
    const defaultCheckedKeys = [buildDataScopeMemberNodeKey(record.id)];
    const savedCheckedKeys = memberDataScopeCheckedKeyMap[record.id] || [];
    const initialCheckedKeys = (savedCheckedKeys.length ? savedCheckedKeys : defaultCheckedKeys)
      .map((item) => item.trim())
      .filter((item) => item && dataScopeNodeKeySet.has(item));

    setDataScopeTargetMember(record);
    setDataScopeKeyword('');
    setDataScopeCheckedKeys(initialCheckedKeys.length ? initialCheckedKeys : defaultCheckedKeys);
    setDataScopeDrawerVisible(true);
  }

  function handleDataScopeTreeCheck(nextCheckedKeys: unknown) {
    setDataScopeCheckedKeys(normalizeCheckedKeys(nextCheckedKeys));
  }

  function saveMemberDataScope() {
    if (!dataScopeTargetMember) {
      return;
    }

    const normalizedCheckedKeys = dataScopeCheckedKeys.filter((item) =>
      dataScopeNodeKeySet.has(item)
    );

    setMemberDataScopeCheckedKeyMap((prev) => {
      const next = { ...prev };
      if (normalizedCheckedKeys.length) {
        next[dataScopeTargetMember.id] = normalizedCheckedKeys;
      } else {
        delete next[dataScopeTargetMember.id];
      }
      return next;
    });
    Message.success(`员工「${dataScopeTargetMember.name}」数据从属已保存`);
    closeDataScopeDrawer();
  }

  function saveStoreAssignment() {
    if (!storeAssignTarget) {
      return;
    }

    const targetNode = findDepartmentNode(departmentTree, storeAssignTarget.id);
    const targetDepartmentIds = targetNode
      ? collectDepartmentIds(targetNode)
      : [storeAssignTarget.id];
    const targetDepartmentIdSet = new Set(targetDepartmentIds);
    const normalizedStoreIds = normalizeMemberStoreIds(storeAssignSelectedIds);
    const nextAssignments = { ...storeAssignments };

    targetDepartmentIds.forEach((departmentId) => {
      nextAssignments[departmentId] = normalizedStoreIds;
    });

    setStoreAssignments(nextAssignments);
    writeDeptStoreAssignments(nextAssignments);
    setMemberItems((prev) =>
      prev.map((member) =>
        getMemberDepartmentIds(member).some((departmentId) =>
          targetDepartmentIdSet.has(departmentId)
        )
          ? {
              ...member,
              storeIds: normalizedStoreIds,
            }
          : member
      )
    );
    setStoreAssignTarget(null);
    Message.success('门店分配已保存，部门成员门店已同步');
  }

  async function handleDepartmentModalOk() {
    try {
      const values = (await departmentForm.validate()) as DepartmentFormValues;
      const normalizedName = String(values.name || '').trim();
      const normalizedParentId = String(values.parentId || '').trim();
      const parentNode = findDepartmentNode(departmentTree, normalizedParentId);

      if (!parentNode) {
        Message.error('请选择上级部门');
        return;
      }

      const duplicatedName = (parentNode.children || []).some(
        (child) => child.name === normalizedName
      );

      if (duplicatedName) {
        Message.error('同级已存在同名部门，请重新输入');
        return;
      }

      const nextDepartment: MerchantDepartmentNode = {
        id: createDepartmentId(),
        name: normalizedName,
      };

      setDepartmentTree((prev) =>
        appendDepartmentChild(prev, normalizedParentId, nextDepartment)
      );
      setExpandedDepartmentIds((prev) => {
        const next = new Set(prev);
        next.add(normalizedParentId);
        return next;
      });
      setSelectedDepartmentId(nextDepartment.id);
      setDepartmentKeyword('');
      closeDepartmentModal();
      Message.success(`已在「${parentNode.name}」下新建部门`);
    } catch (_) {
      // validation error
    }
  }

  function getDepartmentOption(departmentId: string) {
    return departmentOptions.find((option) => option.value === departmentId);
  }

  function getMemberDepartmentIds(member: MerchantDepartmentMember) {
    const normalizedIds = normalizeStringArray(member.departmentIds);
    return normalizedIds.length ? normalizedIds : [member.departmentId];
  }

  function getMemberDepartmentNames(member: MerchantDepartmentMember) {
    const normalizedNames = normalizeStringArray(member.departmentNames);
    if (normalizedNames.length) {
      return normalizedNames;
    }

    const fallbackNames = getMemberDepartmentIds(member).flatMap(
      (departmentId) => {
        const option = getDepartmentOption(departmentId);
        return option ? [option.label] : [];
      }
    );

    return fallbackNames.length ? fallbackNames : [member.departmentName];
  }

  function normalizeMemberStoreIds(storeIds: unknown) {
    return normalizeStringArray(storeIds).filter((storeId) =>
      validStoreIdSet.has(storeId)
    );
  }

  function getDepartmentStoreBinding(departmentId: string) {
    const pathIds = departmentPathIdMap.get(departmentId) || [departmentId];

    for (let index = pathIds.length - 1; index >= 0; index -= 1) {
      const currentId = pathIds[index];

      if (Object.prototype.hasOwnProperty.call(storeAssignments, currentId)) {
        return {
          hasBinding: true,
          storeIds: normalizeMemberStoreIds(storeAssignments[currentId]),
        };
      }
    }

    return {
      hasBinding: false,
      storeIds: [] as string[],
    };
  }

  function getMemberEffectiveStoreIds(member: MerchantDepartmentMember) {
    const primaryDepartmentId = getMemberDepartmentIds(member)[0] || member.departmentId;
    const departmentBinding = getDepartmentStoreBinding(primaryDepartmentId);

    if (departmentBinding.hasBinding) {
      return departmentBinding.storeIds;
    }

    return normalizeMemberStoreIds(member.storeIds);
  }

  function getMemberStoreDisplayItems(storeIds: string[] = []) {
    return storeIds.flatMap((storeId) => {
      const storeName = storeIdNameMap.get(storeId);
      return storeName ? [{ storeId, storeName }] : [];
    });
  }

  function openCreateMemberModal() {
    const selectedDepartmentStoreBinding =
      getDepartmentStoreBinding(selectedDepartmentId);

    setEditingMember(null);
    memberForm.resetFields();
    memberForm.setFieldsValue({
      name: '',
      phone: '',
      employeeCode: `WX${String(memberItems.length + 1).padStart(4, '0')}`,
      departmentIds: [selectedDepartmentId],
      storeIds: selectedDepartmentStoreBinding.storeIds,
      role: '普通用户',
    });
    setMemberModalVisible(true);
  }

  function openEditMemberModal(record: MerchantDepartmentMember) {
    const memberStoreIds = getMemberEffectiveStoreIds(record);

    setEditingMember(record);
    memberForm.setFieldsValue({
      name: record.name,
      phone: record.phone,
      employeeCode: record.employeeCode,
      departmentIds: getMemberDepartmentIds(record),
      storeIds: memberStoreIds,
      role: record.role,
    });
    setMemberModalVisible(true);
  }

  async function handleMemberModalOk() {
    try {
      const values = (await memberForm.validate()) as MemberFormValues;
      const normalizedName = String(values.name || '').trim();
      const normalizedPhone = String(values.phone || '').trim();
      const normalizedEmployeeCode = String(values.employeeCode || '').trim();
      const normalizedDepartmentIds = normalizeTreeSelectValueArray(
        values.departmentIds
      );
      const normalizedStoreIdsInput = normalizeMemberStoreIds(values.storeIds);
      const normalizedRole = String(values.role || '').trim();
      const nextDepartments = normalizedDepartmentIds.flatMap((departmentId) => {
        const option = getDepartmentOption(departmentId);
        return option ? [option] : [];
      });
      const primaryDepartment = nextDepartments[0];
      const departmentStoreBinding =
        getDepartmentStoreBinding(primaryDepartment?.value || '');
      const finalStoreIds = departmentStoreBinding.hasBinding
        ? departmentStoreBinding.storeIds
        : normalizedStoreIdsInput;

      if (!normalizedDepartmentIds.length || !primaryDepartment) {
        Message.error('请选择所在部门');
        return;
      }

      if (nextDepartments.length !== normalizedDepartmentIds.length) {
        Message.error('所选部门无效，请重新选择');
        return;
      }

      if (editingMember) {
        setMemberItems((prev) =>
          prev.map((member) =>
            member.id === editingMember.id
              ? {
                  ...member,
                  name: normalizedName,
                  phone: normalizedPhone,
                  employeeCode: normalizedEmployeeCode,
                  departmentId: primaryDepartment.value,
                  departmentName: primaryDepartment.label,
                  departmentIds: nextDepartments.map((department) => department.value),
                  departmentNames: nextDepartments.map((department) => department.label),
                  storeIds: finalStoreIds,
                  role: normalizedRole,
                }
              : member
          )
        );
        Message.success('员工信息已更新');
      } else {
        setMemberItems((prev) => [
          ...prev,
          {
            id: createMemberId(),
            name: normalizedName,
            phone: normalizedPhone,
            employeeCode: normalizedEmployeeCode,
            departmentId: primaryDepartment.value,
            departmentName: primaryDepartment.label,
            departmentIds: nextDepartments.map((department) => department.value),
            departmentNames: nextDepartments.map((department) => department.label),
            storeIds: finalStoreIds,
            role: normalizedRole,
            position: '-',
          },
        ]);
        Message.success('员工已新建');
      }

      closeMemberModal();
    } catch (_) {
      // validation error
    }
  }

  function renderDepartmentNode(node: MerchantDepartmentNode, depth: number) {
    const hasChildren = Boolean(node.children?.length);
    const expanded =
      Boolean(departmentKeyword.trim()) || expandedDepartmentIds.has(node.id);
    const selected = selectedDepartmentId === node.id;
    const rowClassName = [
      styles.departmentRow,
      selected && styles.departmentRowActive,
    ]
      .filter(Boolean)
      .join(' ');
    const departmentStoreBinding = getDepartmentStoreBinding(node.id);

    return (
      <div key={node.id} className={styles.departmentNode}>
        <div
          className={rowClassName}
          style={{ paddingLeft: 14 + depth * 18 }}
          onClick={() => setSelectedDepartmentId(node.id)}
        >
          <span className={styles.dragHandle}>
            <IconDragDotVertical />
          </span>
          <button
            type="button"
            className={styles.expandButton}
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) {
                toggleExpand(node.id);
              }
            }}
          >
            {hasChildren ? (
              expanded ? (
                <IconDown />
              ) : (
                <IconRight />
              )
            ) : (
              <span className={styles.expandPlaceholder} />
            )}
          </button>
          <span className={styles.departmentName}>{node.name}</span>
          {Boolean(departmentStoreBinding.storeIds.length) && (
            <span className={styles.storeBadge}>
              {departmentStoreBinding.storeIds.length}店
            </span>
          )}
          <span className={styles.departmentSpacer} />
          <span
            className={styles.departmentActionWrap}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.departmentMoreButton}
              onClick={(event) => {
                event.stopPropagation();
                setActionDepartmentId((currentId) =>
                  currentId === node.id ? null : node.id
                );
              }}
            >
              <IconMoreVertical />
            </button>

            {actionDepartmentId === node.id && (
              <span className={styles.departmentActionCard}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openCreateDepartmentModal(node.id);
                  }}
                >
                  <IconPlus />
                  <span>新建</span>
                </button>
                <button
                  type="button"
                  onClick={(event) =>
                    handleDepartmentAction(event, '编辑部门', node.name)
                  }
                >
                  <IconEdit />
                  <span>编辑</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => openStoreAssignModal(node, event)}
                >
                  <IconApps />
                  <span>负责门店</span>
                </button>
                <button
                  type="button"
                  className={styles.departmentDangerAction}
                  onClick={(event) =>
                    handleDepartmentAction(event, '删除部门', node.name)
                  }
                >
                  <IconDelete />
                  <span>删除</span>
                </button>
              </span>
            )}
          </span>
        </div>

        {hasChildren && expanded && (
          <div className={styles.departmentChildren}>
            {node.children?.map((child) =>
              renderDepartmentNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  }

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 140,
      render: (value: string) => (
        <Typography.Text className={styles.memberName}>{value}</Typography.Text>
      ),
    },
    {
      title: '所属部门',
      dataIndex: 'departmentName',
      width: 190,
      render: (_: string, record: MerchantDepartmentMember) =>
        getMemberDepartmentNames(record).join(' / '),
    },
    {
      title: '所在门店',
      dataIndex: 'storeIds',
      width: 260,
      render: (_: string[], record: MerchantDepartmentMember) => {
        const storeDisplayItems = getMemberStoreDisplayItems(
          getMemberEffectiveStoreIds(record)
        );

        if (!storeDisplayItems.length) {
          return <span className={styles.memberStoreEmpty}>--</span>;
        }

        return (
          <span className={styles.memberStoreTags}>
            {storeDisplayItems.map((item) => (
              <span key={item.storeId} className={styles.memberStoreTag}>
                {item.storeName}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 150,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 170,
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: MerchantDepartmentMember) => (
        <span className={styles.tableActions}>
          <Link onClick={() => openEditMemberModal(record)}>编辑</Link>
          <span
            className={styles.memberMoreWrap}
            onClick={(event) => event.stopPropagation()}
          >
            <Link onClick={(event) => toggleMemberMoreCard(event, record)}>
              更多
              <IconDown className={styles.moreIcon} />
            </Link>
          </span>
        </span>
      ),
    },
  ];
  const selectedDepartmentStoreIds =
    getDepartmentStoreBinding(selectedDepartmentId).storeIds;

  return (
    <>
      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <Typography.Title heading={6} className={styles.sidebarTitle}>
              部门列表
            </Typography.Title>
            <Button
              type="text"
              shape="circle"
              icon={<IconPlus />}
              className={styles.sidebarCreateButton}
              onClick={() => openCreateDepartmentModal()}
            />
          </div>

          <Input
            allowClear
            className={styles.departmentSearch}
            placeholder="请输入搜索关键字"
            prefix={<IconSearch />}
            value={departmentKeyword}
            onChange={setDepartmentKeyword}
          />

          <div className={styles.departmentTree}>
            {filteredTree.length ? (
              filteredTree.map((node) => renderDepartmentNode(node, 0))
            ) : (
              <div className={styles.departmentEmpty}>暂无匹配部门</div>
            )}
          </div>
        </aside>

        <main className={styles.content}>
          <section className={styles.contentHeader}>
            <div>
              <div className={styles.titleLine}>
                <Typography.Title heading={5} className={styles.pageTitle}>
                  成员/部门管理
                </Typography.Title>
                <span className={styles.companyName}>
                  {MERCHANT_COMPANY_NAME}
                </span>
              </div>
              <div className={styles.currentDepartment}>
                当前部门：{selectedDepartment?.name || MERCHANT_COMPANY_NAME}，
                共 {tableData.length} 名成员
              </div>
              {selectedDepartmentId !== ROOT_DEPARTMENT_ID && (
                <div className={styles.managedStoreRow}>
                  <span className={styles.managedStoreLabel}>负责门店：</span>
                  {selectedDepartmentStoreIds.length ? (
                    <span className={styles.managedStoreTags}>
                      {selectedDepartmentStoreIds.map((storeId) => {
                        const storeName = storeIdNameMap.get(storeId);
                        return storeName ? (
                          <span key={storeId} className={styles.managedStoreTag}>
                            {storeName}
                          </span>
                        ) : null;
                      })}
                    </span>
                  ) : (
                    <span className={styles.managedStoreNone}>
                      未配置（不限制）
                      <button
                        type="button"
                        className={styles.managedStoreSetBtn}
                        onClick={() =>
                          openStoreAssignModal({
                            id: selectedDepartmentId,
                            name: selectedDepartment?.name || '',
                          })
                        }
                      >
                        立即配置
                      </button>
                    </span>
                  )}
                  {selectedDepartmentStoreIds.length > 0 && (
                    <button
                      type="button"
                      className={styles.managedStoreEditBtn}
                      onClick={() =>
                        openStoreAssignModal({
                          id: selectedDepartmentId,
                          name: selectedDepartment?.name || '',
                        })
                      }
                    >
                      修改
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.headerActions}>
              <Button onClick={() => showPendingMessage('设置管理员')}>
                设置管理员
              </Button>
              <Button onClick={openImportModal}>
                导入员工
              </Button>
              <Button type="primary" onClick={openCreateMemberModal}>
                新建员工
              </Button>
            </div>
          </section>

          <section className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${styles.tabActive}`}
            >
              成员列表
            </button>
          </section>

          <section className={styles.filterBar}>
            <Select
              className={styles.statusSelect}
              value="all"
              onChange={() => showPendingMessage('成员状态筛选')}
            >
              <Option value="all">全部</Option>
              <Option value="active">在职员工</Option>
              <Option value="resigned">离职员工</Option>
            </Select>
            <Input
              allowClear
              className={styles.employeeSearch}
              placeholder="搜索员工"
              prefix={<IconSearch />}
            />
            <div className={styles.dateFilter}>
              <span>创建时间：</span>
              <RangePicker
                className={styles.rangePicker}
                placeholder={['开始日期', '结束日期']}
                onChange={() => showPendingMessage('创建时间筛选')}
              />
            </div>
            <Button type="primary" onClick={() => showPendingMessage('搜索')}>
              搜索
            </Button>
          </section>

          <section className={styles.tablePanel}>
            <div className={styles.tableScroll}>
              <Table
                rowKey="id"
                columns={columns}
                data={currentPageMembers}
                noDataElement="当前部门暂无成员"
                pagination={false}
                rowSelection={{
                  columnWidth: 48,
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }}
                scroll={{ x: 1300 }}
              />
            </div>
            <div className={styles.tablePagination}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                showJumper
                showTotal={(total) => `共 ${total} 条`}
                sizeCanChange
                sizeOptions={[10, 20, 50]}
                total={tableData.length}
                onChange={(pageNumber, nextPageSize) => {
                  setCurrentPage(pageNumber);
                  setPageSize(nextPageSize);
                }}
              />
            </div>
          </section>
        </main>
      </div>

      {activeMemberAction && (
        <span
          className={styles.memberMoreCard}
          style={{
            top: activeMemberAction.top,
            left: activeMemberAction.left,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={(event) =>
              handleMemberMoreAction(
                event,
                '数据从属',
                activeMemberAction.record
              )
            }
          >
            数据从属
          </button>
          <button
            type="button"
            onClick={(event) =>
              handleMemberMoreAction(
                event,
                '重置密码',
                activeMemberAction.record
              )
            }
          >
            重置密码
          </button>
          <button
            type="button"
            onClick={(event) =>
              handleMemberMoreAction(
                event,
                '修改密码',
                activeMemberAction.record
              )
            }
          >
            修改密码
          </button>
          <button
            type="button"
            onClick={(event) =>
              handleMemberMoreAction(
                event,
                '离职处理',
                activeMemberAction.record
              )
            }
          >
            离职处理
          </button>
        </span>
      )}

      <Drawer
        title={`数据从属 · ${dataScopeTargetMember?.name || ''}`}
        visible={dataScopeDrawerVisible}
        width={1160}
        placement="right"
        className={styles.dataScopeDrawer}
        footer={
          <div className={styles.dataScopeFooter}>
            <Button onClick={closeDataScopeDrawer}>取消</Button>
            <Button type="primary" onClick={saveMemberDataScope}>
              保存
            </Button>
          </div>
        }
        autoFocus={false}
        onCancel={closeDataScopeDrawer}
      >
        {dataScopeTargetMember && (
          <div className={styles.dataScopeContent}>
            <div className={styles.dataScopeMemberMeta}>
              <span>姓名：{dataScopeTargetMember.name}</span>
              <span>部门：{dataScopeTargetDepartmentPath}</span>
              <span>岗位：{dataScopeTargetMember.position || '-'}</span>
              <span>职级：{dataScopeTargetMember.role || '-'}</span>
            </div>

            <div className={styles.dataScopeGrid}>
              <section className={styles.dataScopePanel}>
                <div className={styles.dataScopePanelHeader}>人员管理</div>
                <div className={styles.dataScopePanelBody}>
                  <Input
                    allowClear
                    className={styles.dataScopeSearch}
                    placeholder="输入关键字进行过滤"
                    prefix={<IconSearch />}
                    value={dataScopeKeyword}
                    onChange={setDataScopeKeyword}
                  />
                  <div className={styles.dataScopeTreeWrap}>
                    <Tree
                      checkable
                      blockNode
                      checkStrictly
                      checkedKeys={dataScopeCheckedKeys}
                      treeData={filteredDataScopeTree}
                      defaultExpandedKeys={filteredDataScopeExpandedKeys}
                      onCheck={handleDataScopeTreeCheck}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.dataScopePanel}>
                <div className={styles.dataScopePanelHeader}>
                  <span>已选择关联人员</span>
                  <span className={styles.dataScopeCount}>
                    {dataScopeEffectiveMemberIdSet.size} 人
                  </span>
                </div>
                <div className={styles.dataScopePanelBody}>
                  <div className={styles.dataScopeSummaryWrap}>
                    {dataScopeSummaryTreeData.length ? (
                      <Tree
                        blockNode
                        className={styles.dataScopeSummaryTree}
                        treeData={dataScopeSummaryTreeData}
                        defaultExpandedKeys={dataScopeSummaryExpandedKeys}
                      />
                    ) : (
                      <Empty
                        className={styles.dataScopeEmpty}
                        description="请先在左侧勾选组织节点或员工"
                      />
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="新建部门"
        visible={departmentModalVisible}
        onOk={handleDepartmentModalOk}
        onCancel={closeDepartmentModal}
        okText="确定"
        cancelText="取消"
        style={{ width: 760, maxWidth: 'calc(100vw - 32px)' }}
        focusLock
        autoFocus={false}
      >
        <Form
          form={departmentForm}
          className={styles.departmentCreateForm}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
        >
          <Form.Item
            field="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" maxLength={20} />
          </Form.Item>
          <Form.Item
            field="parentId"
            label="上级部门"
            rules={[{ required: true, message: '请选择上级部门' }]}
          >
            <TreeSelect
              showSearch
              allowClear
              placeholder="请选择上级部门"
              treeData={departmentTreeSelectData}
              treeProps={{ defaultExpandedKeys: departmentTreeExpandedKeys }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingMember ? '编辑员工' : '新建员工'}
        visible={memberModalVisible}
        onOk={handleMemberModalOk}
        onCancel={closeMemberModal}
        style={{ width: 520 }}
        focusLock
        autoFocus={false}
      >
        <Form
          form={memberForm}
          className={styles.memberForm}
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 17 }}
        >
          <Form.Item
            field="name"
            label="员工姓名"
            rules={[{ required: true, message: '请输入员工姓名' }]}
          >
            <Input placeholder="请输入员工姓名" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item
            field="phone"
            label="员工账号"
            rules={[{ required: true, message: '请输入员工账号' }]}
          >
            <Input placeholder="请输入手机号" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item field="employeeCode" label="员工编号">
            <Input placeholder="请输入员工编号" maxLength={30} showWordLimit />
          </Form.Item>
          <Form.Item
            field="departmentIds"
            label="所在部门"
            rules={[{ required: true, message: '请选择所在部门' }]}
          >
            <TreeSelect
              showSearch
              allowClear
              treeCheckable
              treeCheckStrictly
              maxTagCount="responsive"
              placeholder="请选择所在部门"
              treeData={departmentTreeSelectData}
              treeProps={{ defaultExpandedKeys: departmentTreeExpandedKeys }}
            />
          </Form.Item>
          <Form.Item field="storeIds" label="所在门店">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="请选择所在门店"
            >
              {storeItems.map((store) => (
                <Option key={store.id} value={store.id}>
                  {store.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item field="role" label="员工角色">
            <Select allowClear placeholder="请选择员工角色">
              {MEMBER_ROLE_OPTIONS.map((role) => (
                <Option key={role} value={role}>
                  {role}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入员工"
        visible={importModalVisible}
        onOk={handleImportModalOk}
        onCancel={closeImportModal}
        okText="确认导入"
        cancelText="取消"
        style={{ width: 480 }}
        focusLock
        autoFocus={false}
      >
        <Form
          form={importForm}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item label="导入文件">
            <Button onClick={() => showPendingMessage('选择文件')}>选择文件</Button>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              支持 .xlsx、.csv 格式
            </Typography.Text>
          </Form.Item>
          <Form.Item
            field="role"
            label="默认角色"
            rules={[{ required: true, message: '请选择默认角色' }]}
            extra="导入时未指定角色的员工将自动应用此角色。"
          >
            <Select placeholder="请选择默认角色">
              {MEMBER_ROLE_OPTIONS.map((role) => (
                <Option key={role} value={role}>
                  {role}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`负责门店 · ${storeAssignTarget?.name || ''}`}
        visible={Boolean(storeAssignTarget)}
        onOk={saveStoreAssignment}
        onCancel={() => setStoreAssignTarget(null)}
        okText="保存"
        cancelText="取消"
        style={{ width: 480 }}
        focusLock
        autoFocus={false}
      >
        <p className={styles.storeAssignDesc}>
          选择该部门负责管理的门店。部门成员进入门店系统后，将只能看到所分配门店的数据。
        </p>
        <Select
          mode="multiple"
          placeholder="请选择负责门店（不选则不限制）"
          value={storeAssignSelectedIds}
          onChange={(value) => setStoreAssignSelectedIds(value as string[])}
          style={{ width: '100%' }}
          showSearch
        >
          {storeItems.map((store) => (
            <Option key={store.id} value={store.id}>
              {store.name}
            </Option>
          ))}
        </Select>
      </Modal>
    </>
  );
}

export default MerchantDepartmentPage;
