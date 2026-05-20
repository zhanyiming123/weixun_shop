import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  Message,
  Modal,
  Switch,
  Tree,
  Typography,
} from '@arco-design/web-react';
import {
  IconFile,
  IconMenu,
  IconRecord,
} from '@arco-design/web-react/icon';
import usePersistentState from '@/utils/usePersistentState';
import {
  appendMenuNode,
  collectMenuNodeKeys,
  createDefaultMenuConfigSystems,
  createMenuConfigNode,
  filterMenuNodes,
  findMenuNodeById,
  findMenuNodeParent,
  findMenuNodePath,
  getNodeCreateActions,
  MENU_CONFIG_STORAGE_KEY,
  MENU_CREATE_ACTION_LABELS,
  MENU_NODE_STATUS_LABELS,
  MENU_NODE_TYPE_LABELS,
  MenuConfigCreateAction,
  MenuConfigNodeDraft,
  MenuConfigNode,
  MenuConfigNodeType,
  MenuConfigSystem,
  removeMenuNode,
  updateMenuNode,
} from './data';
import styles from './index.module.less';

type NodeModalValues = {
  name: string;
  path: string;
  permissionCode: string;
  icon: string;
  statusEnabled: boolean;
  sensitive: boolean;
  nodeType?: 'menu' | 'page';
};

type TreeRenderNode = {
  key: string;
  title: string;
  currentNode: MenuConfigNode;
  children?: TreeRenderNode[];
};

type ModalMode = 'create' | 'edit';

const { useForm } = Form;

const PERMISSION_CODE_RULE = /^[A-Za-z][A-Za-z0-9_-]*(,[A-Za-z][A-Za-z0-9_-]*)*$/;

function getNodeIcon(type: MenuConfigNodeType) {
  if (type === 'menu') {
    return <IconMenu />;
  }

  if (type === 'page') {
    return <IconFile />;
  }

  return <IconRecord />;
}

function getNodeActionButtonText(action: MenuConfigCreateAction) {
  return MENU_CREATE_ACTION_LABELS[action];
}

function toTreeData(nodes: MenuConfigNode[]): TreeRenderNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    currentNode: node,
    children: node.children?.length ? toTreeData(node.children) : undefined,
  }));
}

function getFirstNodeId(system: MenuConfigSystem | undefined) {
  return system?.nodes[0]?.id || '';
}

function getNodeNameFieldLabel(action: MenuConfigCreateAction) {
  if (action === 'menu') {
    return '菜单名称';
  }

  if (action === 'page') {
    return '页面名称';
  }

  return '名称';
}

function getNodeStatusFieldLabel(action: MenuConfigCreateAction) {
  if (action === 'menu') {
    return '菜单状态';
  }

  if (action === 'page') {
    return '页面状态';
  }

  return '按钮状态';
}

function getNodeModalTitle(action: MenuConfigCreateAction) {
  if (action === 'menu') {
    return '新增菜单';
  }

  if (action === 'page') {
    return '新增页面';
  }

  return '新增按钮';
}

function createDefaultFormValues(action: MenuConfigCreateAction): NodeModalValues {
  return {
    nodeType: action === 'button' ? undefined : action,
    name: '',
    path: '',
    permissionCode: '',
    icon: '',
    statusEnabled: true,
    sensitive: false,
  };
}

function createEditFormValues(node: MenuConfigNode): NodeModalValues {
  return {
    nodeType: node.type === 'button' ? undefined : node.type,
    name: node.name,
    path: node.path,
    permissionCode: node.permissionCode,
    icon: node.icon,
    statusEnabled: node.status === 'enabled',
    sensitive: node.sensitive,
  };
}

function MerchantSystemMenuConfigPage() {
  const [systems, setSystems] = usePersistentState<MenuConfigSystem[]>(
    MENU_CONFIG_STORAGE_KEY,
    createDefaultMenuConfigSystems()
  );
  const [selectedSystemId, setSelectedSystemId] = useState(systems[0]?.id || '');
  const [selectedNodeId, setSelectedNodeId] = useState(
    getFirstNodeId(systems[0])
  );
  const [systemKeyword, setSystemKeyword] = useState('');
  const [treeKeyword, setTreeKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [activeModalAction, setActiveModalAction] =
    useState<MenuConfigCreateAction | null>(null);
  const [form] = useForm<NodeModalValues>();

  const filteredSystems = useMemo(() => {
    const keyword = systemKeyword.trim().toLowerCase();

    if (!keyword) {
      return systems;
    }

    return systems.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [systemKeyword, systems]);

  const currentSystem = useMemo(
    () => systems.find((item) => item.id === selectedSystemId) || systems[0],
    [selectedSystemId, systems]
  );

  const treeNodes = currentSystem?.nodes || [];
  const filteredTreeNodes = useMemo(
    () => filterMenuNodes(treeNodes, treeKeyword),
    [treeKeyword, treeNodes]
  );
  const selectedNode = useMemo(
    () => findMenuNodeById(treeNodes, selectedNodeId) || null,
    [selectedNodeId, treeNodes]
  );
  const selectedNodeParent = useMemo(
    () => (selectedNode ? findMenuNodeParent(treeNodes, selectedNode.id) : null),
    [selectedNode, treeNodes]
  );
  const selectedNodeActions = useMemo(
    () => (selectedNode ? getNodeCreateActions(selectedNode.type) : []),
    [selectedNode]
  );

  useEffect(() => {
    if (!currentSystem) {
      return;
    }

    const hasSelectedNode = selectedNodeId
      ? Boolean(findMenuNodeById(currentSystem.nodes, selectedNodeId))
      : false;

    if (!hasSelectedNode) {
      setSelectedNodeId(getFirstNodeId(currentSystem));
    }
  }, [currentSystem, selectedNodeId]);

  useEffect(() => {
    if (!currentSystem) {
      setExpandedKeys([]);
      return;
    }

    if (treeKeyword.trim()) {
      setExpandedKeys(collectMenuNodeKeys(filteredTreeNodes));
      return;
    }

    const selectedPath = selectedNodeId
      ? findMenuNodePath(currentSystem.nodes, selectedNodeId)
      : [];
    const allKeys = collectMenuNodeKeys(currentSystem.nodes);
    const nextExpandedKeys = selectedPath.length ? selectedPath.slice(0, -1) : allKeys;

    setExpandedKeys(nextExpandedKeys.length ? nextExpandedKeys : allKeys);
  }, [currentSystem, filteredTreeNodes, selectedNodeId, treeKeyword]);

  useEffect(() => {
    if (!activeModalAction) {
      form.resetFields();
      return;
    }

    if (modalMode === 'edit' && selectedNode) {
      form.setFieldsValue(createEditFormValues(selectedNode));
      return;
    }

    form.setFieldsValue(createDefaultFormValues(activeModalAction));
  }, [activeModalAction, form, modalMode, selectedNode]);

  function handleSystemSelect(systemId: string) {
    setSelectedSystemId(systemId);
    const nextSystem = systems.find((item) => item.id === systemId);
    setSelectedNodeId(getFirstNodeId(nextSystem));
    setTreeKeyword('');
  }

  function handleOpenCreateModal(action: MenuConfigCreateAction) {
    setModalMode('create');
    setActiveModalAction(action);
  }

  function handleOpenEditModal() {
    if (!selectedNode) {
      return;
    }

    setModalMode('edit');
    setActiveModalAction(selectedNode.type);
  }

  function handleCloseModal() {
    setActiveModalAction(null);
  }

  function handleDeleteNode() {
    if (!currentSystem || !selectedNode) {
      return;
    }

    Modal.confirm({
      title: '确认删除该节点',
      content: '删除后，该节点配置将失效。',
      onOk: () => {
        const nextSystems = systems.map((item) => {
          if (item.id !== currentSystem.id) {
            return item;
          }

          return {
            ...item,
            nodes: removeMenuNode(item.nodes, selectedNode.id),
          };
        });
        const nextCurrentSystem =
          nextSystems.find((item) => item.id === currentSystem.id) || currentSystem;
        const nextSelectedNodeId =
          selectedNodeParent?.id || getFirstNodeId(nextCurrentSystem);

        setSystems(nextSystems);
        setSelectedNodeId(nextSelectedNodeId);
        Message.success('删除节点成功');
      },
    });
  }

  async function handleSubmitNode() {
    if (!currentSystem || !selectedNode || !activeModalAction) {
      return;
    }

    const values = await form.validate();
    const nextDraft: MenuConfigNodeDraft = {
      name: values.name.trim(),
      path: values.path.trim(),
      permissionCode: values.permissionCode.trim(),
      icon: values.icon.trim(),
      status: values.statusEnabled ? 'enabled' : 'disabled',
      sensitive: values.sensitive,
    };

    if (modalMode === 'edit') {
      const nextSystems = systems.map((item) =>
        item.id === currentSystem.id
          ? {
              ...item,
              nodes: updateMenuNode(item.nodes, selectedNode.id, nextDraft),
            }
          : item
      );

      setSystems(nextSystems);
      setActiveModalAction(null);
      Message.success('编辑节点成功');
      return;
    }

    const nextNode = createMenuConfigNode(activeModalAction, selectedNode.id, nextDraft);
    const nextSystems = systems.map((item) =>
      item.id === currentSystem.id
        ? {
            ...item,
            nodes: appendMenuNode(item.nodes, selectedNode.id, nextNode),
          }
        : item
    );

    setSystems(nextSystems);
    setSelectedNodeId(nextNode.id);
    setExpandedKeys((prev) => Array.from(new Set([...prev, selectedNode.id])));
    setActiveModalAction(null);
    Message.success(`${getNodeActionButtonText(activeModalAction)}成功`);
  }

  function renderSystemList() {
    if (!filteredSystems.length) {
      return (
        <div className={styles.emptyState}>
          <Empty description="没有匹配到系统" />
        </div>
      );
    }

    return filteredSystems.map((system) => {
      const isActive = system.id === currentSystem?.id;

      return (
        <button
          key={system.id}
          type="button"
          className={`${styles.systemItem} ${isActive ? styles.systemItemActive : ''}`}
          onClick={() => handleSystemSelect(system.id)}
        >
          <span className={styles.systemName}>{system.name}</span>
        </button>
      );
    });
  }

  function renderTreeTitle(node: TreeRenderNode) {
    const currentNode = node.currentNode;
    const isSelected = currentNode.id === selectedNode?.id;

    return (
      <div
        className={`${styles.treeNode} ${isSelected ? styles.treeNodeSelected : ''}`}
      >
        <span className={styles.nodeIcon}>{getNodeIcon(currentNode.type)}</span>
        <span className={styles.nodeName}>{currentNode.name}</span>
      </div>
    );
  }

  function renderInfoItem(label: string, value: string) {
    return (
      <div className={styles.infoItem}>
        <span className={styles.infoLabel}>{label}:</span>
        <div className={styles.infoValue}>{value || '-'}</div>
      </div>
    );
  }

  function renderDetailContent() {
    if (!selectedNode) {
      return (
        <div className={styles.emptyState}>
          <Empty description="请选择一个节点查看详情" />
        </div>
      );
    }

    return (
      <div className={styles.infoSection}>
        <div className={styles.infoGrid}>
          {renderInfoItem('类型', MENU_NODE_TYPE_LABELS[selectedNode.type])}
          {renderInfoItem(
            '上级节点',
            selectedNodeParent ? selectedNodeParent.name : currentSystem?.name || '-'
          )}
          {renderInfoItem('名称', selectedNode.name)}
          {renderInfoItem('路由', selectedNode.path)}
          {renderInfoItem('权限码', selectedNode.permissionCode)}
          {renderInfoItem('状态', MENU_NODE_STATUS_LABELS[selectedNode.status])}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <Typography.Title className={styles.panelTitle} heading={6}>
              应用系统
            </Typography.Title>
          </div>

          <div className={styles.searchSection}>
            <Input
              allowClear
              className={styles.searchBar}
              placeholder="请输入内容"
              value={systemKeyword}
              onChange={setSystemKeyword}
            />
          </div>

          <div className={styles.systemSummary}>共{systems.length}个系统</div>
          <div className={styles.systemList}>{renderSystemList()}</div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <Typography.Title className={styles.panelTitle} heading={6}>
              菜单树
            </Typography.Title>
          </div>

          <div className={styles.searchSection}>
            <Input
              allowClear
              className={styles.searchBar}
              placeholder="搜索节点名称或权限码"
              value={treeKeyword}
              onChange={setTreeKeyword}
            />
          </div>

          <div className={styles.treeWrap}>
            {filteredTreeNodes.length ? (
              <Tree
                blockNode
                className={styles.tree}
                expandedKeys={expandedKeys}
                selectedKeys={selectedNode ? [selectedNode.id] : []}
                treeData={toTreeData(filteredTreeNodes)}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                onSelect={(keys) => {
                  if (keys.length) {
                    setSelectedNodeId(String(keys[0]));
                  }
                }}
                renderTitle={(node) => renderTreeTitle(node as unknown as TreeRenderNode)}
              />
            ) : (
              <div className={styles.emptyState}>
                <Empty description="没有匹配到节点" />
              </div>
            )}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.detailPanel}`}>
          <div className={styles.detailHeader}>
            <Typography.Title className={styles.panelTitle} heading={6}>
              节点详情
            </Typography.Title>

            <div className={styles.actionGroup}>
              {selectedNodeActions.map((action) => (
                <Button key={action} type="primary" onClick={() => handleOpenCreateModal(action)}>
                  {getNodeActionButtonText(action)}
                </Button>
              ))}
            </div>
          </div>

          <div className={styles.detailBody}>
            <div className={styles.detailTools}>
              <button type="button" className={styles.toolButton} onClick={handleOpenEditModal}>
                编辑节点
              </button>
              <button type="button" className={styles.toolButton} onClick={handleDeleteNode}>
                删除节点
              </button>
            </div>
            {renderDetailContent()}
          </div>
        </section>
      </div>

      <Modal
        title={
          activeModalAction
            ? modalMode === 'edit'
              ? '编辑节点'
              : getNodeModalTitle(activeModalAction)
            : ''
        }
        visible={Boolean(activeModalAction)}
        style={{ width: 760 }}
        onCancel={handleCloseModal}
        footer={null}
      >
        {activeModalAction && selectedNode ? (
          <Form
            form={form}
            className={styles.modalForm}
            layout="horizontal"
            initialValues={createDefaultFormValues(activeModalAction)}
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 19 }}
          >
            <Form.Item label="父节点">
              <Input value={selectedNode.name} disabled />
            </Form.Item>

            <Form.Item
              field="name"
              label={getNodeNameFieldLabel(activeModalAction)}
              rules={[
                { required: true, message: `请输入${getNodeNameFieldLabel(activeModalAction)}` },
              ]}
            >
              <Input placeholder="请输入" />
            </Form.Item>

            <Form.Item
              field="path"
              label="路由"
              rules={[{ required: true, message: '请输入路由' }]}
            >
              <Input placeholder="请输入" />
            </Form.Item>

            <Form.Item
              field="permissionCode"
              label="权限码"
              rules={[
                { required: true, message: '请输入权限码' },
                {
                  match: PERMISSION_CODE_RULE,
                  message: '请输入英文开头，支持中横线/下划线/逗号分隔多个权限码',
                },
              ]}
            >
              <Input
                placeholder={activeModalAction === 'button' ? '请输入(英文开头加中横线下划线冒号分号英文一个或多个)' : '请输入'}
              />
            </Form.Item>

            <Form.Item
              field="statusEnabled"
              label={getNodeStatusFieldLabel(activeModalAction)}
              triggerPropName="checked"
            >
              <Switch checkedText="启用" uncheckedText="禁用" />
            </Form.Item>

            <div className={styles.modalFooter}>
              <Button onClick={handleCloseModal}>取消</Button>
              <Button type="primary" onClick={handleSubmitNode}>
                确定
              </Button>
            </div>
          </Form>
        ) : null}
      </Modal>
    </>
  );
}

export default MerchantSystemMenuConfigPage;
