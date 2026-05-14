import { readPersistentValue } from '@/utils/usePersistentState';

export type MenuConfigNodeType = 'menu' | 'page' | 'button';
export type MenuConfigNodeStatus = 'enabled' | 'disabled';
export type MenuConfigCreateAction = MenuConfigNodeType;

export type MenuConfigNode = {
  id: string;
  name: string;
  type: MenuConfigNodeType;
  path: string;
  permissionCode: string;
  icon: string;
  status: MenuConfigNodeStatus;
  sensitive: boolean;
  parentId: string | null;
  children?: MenuConfigNode[];
  updatedAt: string;
};

export type MenuConfigSystem = {
  id: string;
  name: string;
  code: string;
  description: string;
  owner: string;
  nodes: MenuConfigNode[];
};

export type MenuConfigNodeDraft = {
  name: string;
  path: string;
  permissionCode: string;
  icon: string;
  status: MenuConfigNodeStatus;
  sensitive: boolean;
};

export const MENU_CONFIG_STORAGE_KEY = 'merchant-system-menu-config-systems-v2';

export const MENU_NODE_TYPE_LABELS: Record<MenuConfigNodeType, string> = {
  menu: '菜单',
  page: '页面',
  button: '按钮',
};

export const MENU_NODE_STATUS_LABELS: Record<MenuConfigNodeStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
};

export const MENU_CREATE_ACTION_LABELS: Record<MenuConfigCreateAction, string> = {
  menu: '新增子菜单',
  page: '新增页面',
  button: '新增按钮',
};

const MENU_CREATE_ACTIONS_BY_TYPE: Record<
  MenuConfigNodeType,
  MenuConfigCreateAction[]
> = {
  menu: ['menu', 'page', 'button'],
  page: ['button'],
  button: [],
};

function formatDateTime() {
  return new Date()
    .toLocaleString('zh-CN', {
      hour12: false,
    })
    .replace(/\//g, '-');
}

function createNode(
  id: string,
  type: MenuConfigNodeType,
  name: string,
  path: string,
  permissionCode: string,
  icon: string,
  parentId: string | null,
  children: MenuConfigNode[] = [],
  status: MenuConfigNodeStatus = 'enabled',
  sensitive = false
): MenuConfigNode {
  return {
    id,
    name,
    type,
    path,
    permissionCode,
    icon,
    status,
    sensitive,
    parentId,
    children,
    updatedAt: formatDateTime(),
  };
}

function createMerchantWorkbenchMenuNodes() {
  const productMenu = createNode(
    'menu_product_center',
    'menu',
    '商品中心',
    '/product-center',
    'perm:product-center',
    'IconApps',
    null,
    [
      createNode(
        'page_product_list',
        'page',
        '商品列表',
        '/product-center/products',
        'perm:product-center-products',
        'IconFile',
        'menu_product_center',
        [
          createNode(
            'button_product_create',
            'button',
            '新建商品',
            '/product-center/products/create',
            'perm:product-center-products-create',
            'IconPlus',
            'page_product_list'
          ),
          createNode(
            'button_product_export',
            'button',
            '导出商品',
            '/product-center/products/export',
            'perm:product-center-products-export',
            'IconDownload',
            'page_product_list'
          ),
        ]
      ),
      createNode(
        'page_product_category',
        'page',
        '分类管理',
        '/product-center/categories',
        'perm:product-center-categories',
        'IconFolder',
        'menu_product_center',
        [
          createNode(
            'button_category_create',
            'button',
            '新增分类',
            '/product-center/categories/create',
            'perm:product-center-categories-create',
            'IconPlus',
            'page_product_category'
          ),
        ]
      ),
    ]
  );

  const configMenu = createNode(
    'menu_config_center',
    'menu',
    '配置中心',
    '/config-center',
    'perm:config-center',
    'IconSettings',
    null,
    [
      createNode(
        'menu_member_management',
        'menu',
        '成员管理',
        '/config-center/member-management',
        'perm:config-center-member-management',
        'IconUserGroup',
        'menu_config_center',
        [
          createNode(
            'page_member_detail',
            'page',
            '成员详情',
            '/config-center/member-management/detail',
            'perm:config-center-member-management-detail',
            'IconFile',
            'menu_member_management',
            [
              createNode(
                'button_member_reset_password',
                'button',
                '重置密码',
                '/config-center/member-management/detail/reset-password',
                'perm:config-center-member-management-detail-reset-password',
                'IconKey',
                'page_member_detail'
              ),
              createNode(
                'button_member_disable',
                'button',
                '停用账号',
                '/config-center/member-management/detail/disable',
                'perm:config-center-member-management-detail-disable',
                'IconLock',
                'page_member_detail',
                [],
                'disabled',
                true
              ),
            ]
          ),
          createNode(
            'page_member_transfer',
            'page',
            '迁移匹配',
            '/config-center/member-management/transfer',
            'perm:config-center-member-management-transfer',
            'IconSwap',
            'menu_member_management'
          ),
        ]
      ),
      createNode(
        'menu_permission_template',
        'menu',
        '权限模板',
        '/config-center/permission-template',
        'perm:config-center-permission-template',
        'IconMenu',
        'menu_config_center',
        [
          createNode(
            'page_permission_template_list',
            'page',
            '模板列表',
            '/config-center/permission-template/list',
            'perm:config-center-permission-template-list',
            'IconFile',
            'menu_permission_template'
          ),
        ]
      ),
    ]
  );

  const orderMenu = createNode(
    'menu_order_center',
    'menu',
    '订单中心',
    '/order-center',
    'perm:order-center',
    'IconList',
    null,
    [
      createNode(
        'page_order_list',
        'page',
        '订单列表',
        '/order-center/orders',
        'perm:order-center-orders',
        'IconFile',
        'menu_order_center',
        [
          createNode(
            'button_order_export',
            'button',
            '导出订单',
            '/order-center/orders/export',
            'perm:order-center-orders-export',
            'IconDownload',
            'page_order_list'
          ),
        ]
      ),
    ]
  );

  return [productMenu, configMenu, orderMenu];
}

function createStoreWorkbenchMenuNodes() {
  const storeDashboardMenu = createNode(
    'menu_store_dashboard',
    'menu',
    '经营看板',
    '/store/dashboard',
    'perm:store-dashboard',
    'IconDashboard',
    null,
    [
      createNode(
        'page_store_dashboard_overview',
        'page',
        '数据概览',
        '/store/dashboard/overview',
        'perm:store-dashboard-overview',
        'IconFile',
        'menu_store_dashboard',
        [
          createNode(
            'button_store_dashboard_export',
            'button',
            '导出报表',
            '/store/dashboard/overview/export',
            'perm:store-dashboard-overview-export',
            'IconDownload',
            'page_store_dashboard_overview'
          ),
        ]
      ),
    ]
  );

  const storeOrderMenu = createNode(
    'menu_store_order_center',
    'menu',
    '订单管理',
    '/store/orders',
    'perm:store-orders',
    'IconList',
    null,
    [
      createNode(
        'page_store_order_list',
        'page',
        '订单列表',
        '/store/orders/list',
        'perm:store-orders-list',
        'IconFile',
        'menu_store_order_center',
        [
          createNode(
            'button_store_order_refund',
            'button',
            '处理退款',
            '/store/orders/list/refund',
            'perm:store-orders-list-refund',
            'IconUndo',
            'page_store_order_list'
          ),
        ]
      ),
      createNode(
        'page_store_after_sale',
        'page',
        '售后工单',
        '/store/orders/after-sale',
        'perm:store-orders-after-sale',
        'IconFile',
        'menu_store_order_center'
      ),
    ]
  );

  const storeMemberMenu = createNode(
    'menu_store_member_center',
    'menu',
    '会员运营',
    '/store/members',
    'perm:store-members',
    'IconUserGroup',
    null,
    [
      createNode(
        'page_store_member_list',
        'page',
        '会员列表',
        '/store/members/list',
        'perm:store-members-list',
        'IconFile',
        'menu_store_member_center'
      ),
      createNode(
        'page_store_member_tag',
        'page',
        '会员标签',
        '/store/members/tags',
        'perm:store-members-tags',
        'IconTag',
        'menu_store_member_center'
      ),
    ]
  );

  return [storeDashboardMenu, storeOrderMenu, storeMemberMenu];
}

export function createDefaultMenuConfigSystems(): MenuConfigSystem[] {
  return [
    {
      id: 'system_merchant_workbench',
      name: '电商管理工作台',
      code: 'merchant-workbench',
      description: '商家后台的商品、订单、营销和组织权限统一管理入口。',
      owner: '电商平台研发组',
      nodes: createMerchantWorkbenchMenuNodes(),
    },
    {
      id: 'system_store_workbench',
      name: '店铺运营工作台',
      code: 'store-workbench',
      description: '面向店铺经营现场的订单履约、会员运营和经营分析工作台。',
      owner: '店铺运营产品团队',
      nodes: createStoreWorkbenchMenuNodes(),
    },
  ];
}

export function readMenuConfigSystems() {
  return readPersistentValue<MenuConfigSystem[]>(
    MENU_CONFIG_STORAGE_KEY,
    createDefaultMenuConfigSystems()
  );
}

export function getNodeCreateActions(type: MenuConfigNodeType) {
  return MENU_CREATE_ACTIONS_BY_TYPE[type];
}

export function collectMenuNodeKeys(nodes: MenuConfigNode[]): string[] {
  return nodes.flatMap((node) => [
    node.id,
    ...(node.children?.length ? collectMenuNodeKeys(node.children) : []),
  ]);
}

export function countMenuNodes(nodes: MenuConfigNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countMenuNodes(node.children || []),
    0
  );
}

export function findMenuNodeById(
  nodes: MenuConfigNode[],
  targetId: string
): MenuConfigNode | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }

    if (node.children?.length) {
      const matchedNode = findMenuNodeById(node.children, targetId);
      if (matchedNode) {
        return matchedNode;
      }
    }
  }

  return null;
}

export function findMenuNodeParent(
  nodes: MenuConfigNode[],
  targetId: string
): MenuConfigNode | null {
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === targetId)) {
      return node;
    }

    if (node.children?.length) {
      const matchedParent = findMenuNodeParent(node.children, targetId);
      if (matchedParent) {
        return matchedParent;
      }
    }
  }

  return null;
}

export function findMenuNodePath(
  nodes: MenuConfigNode[],
  targetId: string,
  parentPath: string[] = []
): string[] {
  for (const node of nodes) {
    const currentPath = [...parentPath, node.id];

    if (node.id === targetId) {
      return currentPath;
    }

    if (node.children?.length) {
      const matchedPath = findMenuNodePath(node.children, targetId, currentPath);
      if (matchedPath.length) {
        return matchedPath;
      }
    }
  }

  return [];
}

export function filterMenuNodes(nodes: MenuConfigNode[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return nodes;
  }

  return nodes.reduce<MenuConfigNode[]>((result, node) => {
    const matchedChildren = filterMenuNodes(node.children || [], normalizedKeyword);
    const searchText = [
      node.name,
      node.path,
      node.permissionCode,
      MENU_NODE_TYPE_LABELS[node.type],
    ]
      .join(' ')
      .toLowerCase();

    if (searchText.includes(normalizedKeyword) || matchedChildren.length) {
      result.push({
        ...node,
        children: matchedChildren,
      });
    }

    return result;
  }, []);
}

export function createMenuConfigNode(
  type: MenuConfigNodeType,
  parentId: string,
  draft: MenuConfigNodeDraft
): MenuConfigNode {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    parentId,
    children: type === 'button' ? [] : [],
    updatedAt: formatDateTime(),
    ...draft,
  };
}

export function appendMenuNode(
  nodes: MenuConfigNode[],
  parentId: string,
  nextNode: MenuConfigNode
): MenuConfigNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        updatedAt: formatDateTime(),
        children: [...(node.children || []), nextNode],
      };
    }

    if (node.children?.length) {
      return {
        ...node,
        children: appendMenuNode(node.children, parentId, nextNode),
      };
    }

    return node;
  });
}

export function updateMenuNode(
  nodes: MenuConfigNode[],
  targetId: string,
  draft: MenuConfigNodeDraft
): MenuConfigNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return {
        ...node,
        ...draft,
        updatedAt: formatDateTime(),
      };
    }

    if (node.children?.length) {
      return {
        ...node,
        children: updateMenuNode(node.children, targetId, draft),
      };
    }

    return node;
  });
}

export function removeMenuNode(
  nodes: MenuConfigNode[],
  targetId: string
): MenuConfigNode[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => ({
      ...node,
      children: node.children?.length
        ? removeMenuNode(node.children, targetId)
        : node.children,
    }));
}
