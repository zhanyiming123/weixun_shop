import { describe, expect, it } from 'vitest';
import {
  appendMenuNode,
  createMenuConfigNode,
  createDefaultMenuConfigSystems,
  filterMenuNodes,
  findMenuNodeById,
  getNodeCreateActions,
  MENU_NODE_STATUS_LABELS,
  removeMenuNode,
  updateMenuNode,
} from './data';

describe('merchant system menu config data', () => {
  it('keeps only merchant and store workbench systems in default mocks', () => {
    const systems = createDefaultMenuConfigSystems();

    expect(systems.map((item) => item.name)).toEqual([
      '电商管理工作台',
      '店铺运营工作台',
    ]);
  });

  it('returns create actions by node type', () => {
    expect(getNodeCreateActions('menu')).toEqual(['menu', 'page', 'button']);
    expect(getNodeCreateActions('page')).toEqual(['button']);
    expect(getNodeCreateActions('button')).toEqual([]);
  });

  it('uses enabled and disabled labels for node status text', () => {
    expect(MENU_NODE_STATUS_LABELS.enabled).toBe('启用');
    expect(MENU_NODE_STATUS_LABELS.disabled).toBe('禁用');
  });

  it('appends a node under the selected parent', () => {
    const systems = createDefaultMenuConfigSystems();
    const draftNode = createMenuConfigNode('button', 'page_order_list', {
      name: '批量发货',
      path: '/order-center/orders/batch-delivery',
      permissionCode: 'perm:order-center-orders-batch-delivery',
      icon: 'IconSend',
      status: 'enabled',
      sensitive: false,
    });

    const nextNodes = appendMenuNode(
      systems[0].nodes,
      'page_order_list',
      draftNode
    );

    expect(
      findMenuNodeById(nextNodes, 'page_order_list')?.children?.some(
        (item) => item.id === draftNode.id
      )
    ).toBe(true);
  });

  it('keeps ancestor nodes when filtering by descendant keyword', () => {
    const systems = createDefaultMenuConfigSystems();
    const filteredNodes = filterMenuNodes(systems[0].nodes, '重置密码');
    const configCenterNode = filteredNodes.find((item) => item.name === '配置中心');
    const memberManagementNode = configCenterNode?.children?.find(
      (item) => item.name === '成员管理'
    );
    const memberDetailNode = memberManagementNode?.children?.find(
      (item) => item.name === '成员详情'
    );

    expect(configCenterNode).toBeTruthy();
    expect(memberManagementNode).toBeTruthy();
    expect(memberDetailNode?.children?.map((item) => item.name)).toContain('重置密码');
  });

  it('matches nodes by permission code and keeps the ancestor path', () => {
    const systems = createDefaultMenuConfigSystems();
    const filteredNodes = filterMenuNodes(
      systems[0].nodes,
      'perm:config-center-member-management-detail'
    );
    const configCenterNode = filteredNodes.find((item) => item.name === '配置中心');
    const memberManagementNode = configCenterNode?.children?.find(
      (item) => item.name === '成员管理'
    );

    expect(configCenterNode).toBeTruthy();
    expect(memberManagementNode?.children?.map((item) => item.name)).toContain('成员详情');
  });

  it('updates the selected node while keeping its identity and children', () => {
    const systems = createDefaultMenuConfigSystems();
    const nextNodes = updateMenuNode(systems[0].nodes, 'menu_product_center', {
      name: '商品配置中心',
      path: '/product-config-center',
      permissionCode: 'perm:product-config-center',
      icon: 'IconMenu',
      status: 'disabled',
      sensitive: false,
    });
    const updatedNode = findMenuNodeById(nextNodes, 'menu_product_center');

    expect(updatedNode?.name).toBe('商品配置中心');
    expect(updatedNode?.path).toBe('/product-config-center');
    expect(updatedNode?.permissionCode).toBe('perm:product-config-center');
    expect(updatedNode?.status).toBe('disabled');
    expect(updatedNode?.children?.length).toBeGreaterThan(0);
  });

  it('removes the selected node from the tree', () => {
    const systems = createDefaultMenuConfigSystems();
    const nextNodes = removeMenuNode(systems[0].nodes, 'page_member_transfer');

    expect(findMenuNodeById(nextNodes, 'page_member_transfer')).toBeNull();
    expect(findMenuNodeById(nextNodes, 'menu_member_management')).toBeTruthy();
  });

  it('provides a dedicated menu tree for the store workbench', () => {
    const systems = createDefaultMenuConfigSystems();
    const storeWorkbench = systems[1];

    expect(storeWorkbench.name).toBe('店铺运营工作台');
    expect(storeWorkbench.nodes.map((item) => item.name)).toEqual([
      '经营看板',
      '订单管理',
      '会员运营',
    ]);
    expect(
      findMenuNodeById(storeWorkbench.nodes, 'page_store_order_list')?.name
    ).toBe('订单列表');
  });
});
