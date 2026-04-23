import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Select,
  Tabs,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconDown,
  IconDragDotVertical,
  IconInfoCircle,
  IconPlus,
  IconRight,
} from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  EnterpriseDepartmentItem,
  ENTERPRISE_DEPARTMENT_SCOPE_LABEL_MAP,
  formatEnterpriseDepartmentDateTime,
  getEnterpriseDepartmentListPath,
  normalizeEnterpriseDepartmentTab,
  readEnterpriseDepartmentItems,
  useEnterpriseDepartmentItems,
} from './data';
import { useOrganizationItems } from '@/pages/enterprise/organization/data';

const { useForm } = Form;
const TextArea = Input.TextArea;
const Option = Select.Option;
const TabPane = Tabs.TabPane;

function reorderItems(
  items: EnterpriseDepartmentItem[],
  dragId: string,
  targetId: string,
  pos: 'before' | 'after'
): EnterpriseDepartmentItem[] {
  const drag = items.find((item) => item.id === dragId);
  const target = items.find((item) => item.id === targetId);

  if (
    !drag ||
    !target ||
    drag.parentId !== target.parentId ||
    drag.scope !== target.scope ||
    drag.storeId !== target.storeId
  ) {
    return items;
  }

  const parentId = drag.parentId;
  const siblings = items.filter(
    (item) =>
      item.parentId === parentId &&
      item.scope === drag.scope &&
      item.storeId === drag.storeId
  );
  const rest = siblings.filter((item) => item.id !== dragId);
  const targetIndex = rest.findIndex((item) => item.id === targetId);
  const insertAt = pos === 'after' ? targetIndex + 1 : targetIndex;
  const reordered = [...rest.slice(0, insertAt), drag, ...rest.slice(insertAt)];
  const iterator = reordered[Symbol.iterator]();

  return items.map((item) =>
    item.parentId === parentId &&
    item.scope === drag.scope &&
    item.storeId === drag.storeId
      ? (iterator.next().value as EnterpriseDepartmentItem)
      : item
  );
}

function collectDescendantIds(
  items: EnterpriseDepartmentItem[],
  id: string
): string[] {
  const descendants: string[] = [];
  const queue = [id];
  const visited = new Set<string>([id]);

  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    items.forEach((item) => {
      if (item.parentId === currentId && !visited.has(item.id)) {
        visited.add(item.id);
        descendants.push(item.id);
        queue.push(item.id);
      }
    });
  }

  return descendants;
}

function removeWithDescendants(items: EnterpriseDepartmentItem[], id: string) {
  const toRemove = new Set([id, ...collectDescendantIds(items, id)]);
  return items.filter((item) => !toRemove.has(item.id));
}

function createDepartmentId() {
  return `department_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function EnterpriseDepartmentPage() {
  const history = useHistory();
  const location = useLocation();
  const isStoreConfigDepartmentPage = location.pathname.startsWith(
    '/store-config/department'
  );
  const [items, setItems] = useEnterpriseDepartmentItems();
  const [organizationItems] = useOrganizationItems();
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        readEnterpriseDepartmentItems()
          .filter((item) => item.parentId === null)
          .map((item) => item.id)
      )
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<EnterpriseDepartmentItem | null>(
    null
  );
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');
  const [form] = useForm();

  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const activeTab = useMemo(
    () => normalizeEnterpriseDepartmentTab(locationQuery.tab),
    [locationQuery.tab]
  );
  const storeOptions = useMemo(
    () =>
      organizationItems
        .filter((item) => item.type === 'store')
        .map((item) => ({
          value: item.id,
          label: item.name,
        })),
    [organizationItems]
  );
  const resolvedStoreId = useMemo(() => {
    const rawStoreId =
      typeof locationQuery.storeId === 'string' ? locationQuery.storeId : '';

    if (storeOptions.some((item) => item.value === rawStoreId)) {
      return rawStoreId;
    }

    return storeOptions[0]?.value;
  }, [locationQuery.storeId, storeOptions]);
  const activeStoreId = activeTab === 'store' ? resolvedStoreId : undefined;
  const currentStoreLabel = useMemo(
    () => storeOptions.find((item) => item.value === activeStoreId)?.label || '',
    [activeStoreId, storeOptions]
  );

  useEffect(() => {
    const expectedSearch = activeStoreId
      ? `?tab=${activeTab}&storeId=${activeStoreId}`
      : `?tab=${activeTab}`;
    const expectedPath = `${location.pathname}${expectedSearch}`;

    if (`${location.pathname}${location.search}` !== expectedPath) {
      history.replace(expectedPath);
    }
  }, [activeStoreId, activeTab, history, location.pathname, location.search]);

  useEffect(() => {
    setModalVisible(false);
    setEditingItem(null);
    setAddParentId(null);
    setDragId(null);
    setDragOverId(null);
    setDragOverPos('before');
  }, [activeTab]);

  const currentItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.scope !== activeTab) {
          return false;
        }

        if (activeTab === 'store') {
          return item.storeId === activeStoreId;
        }

        return true;
      }),
    [activeStoreId, activeTab, items]
  );

  const itemMap = useMemo(() => {
    const map = new Map<string, EnterpriseDepartmentItem>();

    currentItems.forEach((item) => {
      map.set(item.id, item);
    });

    return map;
  }, [currentItems]);

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, EnterpriseDepartmentItem[]>();

    currentItems.forEach((item) => {
      const key = item.parentId;
      const group = map.get(key) || [];
      group.push(item);
      map.set(key, group);
    });

    return map;
  }, [currentItems]);

  const branchIds = useMemo(
    () =>
      currentItems
        .filter((item) => (childrenMap.get(item.id) || []).length > 0)
        .map((item) => item.id),
    [childrenMap, currentItems]
  );

  const rootItems = childrenMap.get(null) || [];
  const allExpanded =
    branchIds.length > 0 && branchIds.every((id) => expanded.has(id));

  function getDepartmentPathLabels(parentId: string | null) {
    const labels: string[] = [];
    let currentId = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const currentItem = itemMap.get(currentId);
      if (!currentItem) {
        break;
      }

      labels.unshift(currentItem.name);
      currentId = currentItem.parentId;
    }

    return labels;
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleAll() {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (allExpanded) {
        branchIds.forEach((id) => next.delete(id));
      } else {
        branchIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  function openAddModal(parentId: string | null) {
    if (activeTab === 'store' && !activeStoreId) {
      Message.info('请先选择门店');
      return;
    }

    setEditingItem(null);
    setAddParentId(parentId);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      code: '',
      managerName: '',
      headcount: 0,
      description: '',
    });
    setModalVisible(true);
  }

  function openEditModal(item: EnterpriseDepartmentItem) {
    setEditingItem(item);
    setAddParentId(null);
    form.setFieldsValue({
      name: item.name,
      code: item.code,
      managerName: item.managerName,
      headcount: item.headcount,
      description: item.description,
    });
    setModalVisible(true);
  }

  async function handleModalOk() {
    try {
      const values = await form.validate();
      const normalizedName = String(values.name || '').trim();
      const normalizedCode = String(values.code || '')
        .trim()
        .toUpperCase();
      const normalizedManagerName = String(values.managerName || '').trim();
      const normalizedDescription = String(values.description || '').trim();
      const headcountValue =
        typeof values.headcount === 'number' ? values.headcount : 0;
      const parentId = editingItem ? editingItem.parentId : addParentId;
      const storeId = editingItem ? editingItem.storeId : activeStoreId || null;

      if (!normalizedName) {
        Message.error('请输入部门名称');
        return;
      }

      if (!normalizedCode) {
        Message.error('请输入部门编码');
        return;
      }

      if (activeTab === 'store' && !storeId) {
        Message.error('请先选择门店');
        return;
      }

      const duplicatedCode = currentItems.some(
        (item) => item.code === normalizedCode && item.id !== editingItem?.id
      );

      if (duplicatedCode) {
        Message.error('部门编码已存在，请重新输入');
        return;
      }

      const duplicatedName = currentItems.some(
        (item) =>
          item.parentId === parentId &&
          item.name === normalizedName &&
          item.id !== editingItem?.id
      );

      if (duplicatedName) {
        Message.error('同级已存在同名部门，请重新输入');
        return;
      }

      const nextUpdatedAt = formatEnterpriseDepartmentDateTime(new Date());

      if (editingItem) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: normalizedName,
                  code: normalizedCode,
                  managerName: normalizedManagerName,
                  headcount: headcountValue,
                  description: normalizedDescription,
                  updatedAt: nextUpdatedAt,
                }
              : item
          )
        );
        Message.success('修改成功');
      } else {
        const nextItem: EnterpriseDepartmentItem = {
          id: createDepartmentId(),
          name: normalizedName,
          code: normalizedCode,
          scope: activeTab,
          storeId,
          parentId,
          managerName: normalizedManagerName,
          headcount: headcountValue,
          description: normalizedDescription,
          updatedAt: nextUpdatedAt,
        };

        setItems((prev) => [...prev, nextItem]);

        if (parentId) {
          setExpanded((prev) => {
            const next = new Set(prev);
            next.add(parentId);
            return next;
          });
        }

        Message.success('新增成功');
      }

      setModalVisible(false);
    } catch (_) {
      // validation error
    }
  }

  function handleDelete(item: EnterpriseDepartmentItem) {
    const relatedIds = [item.id, ...collectDescendantIds(currentItems, item.id)];

    setItems((prev) => removeWithDescendants(prev, item.id));
    setExpanded((prev) => {
      const next = new Set(prev);
      relatedIds.forEach((id) => next.delete(id));
      return next;
    });
    Message.success('删除成功');
  }

  function onDragStart(event: React.DragEvent, id: string) {
    setDragId(id);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(event: React.DragEvent, id: string) {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    setDragOverId(id);
    setDragOverPos(
      event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    );
  }

  function onDrop(event: React.DragEvent, targetId: string) {
    event.preventDefault();

    if (dragId && dragId !== targetId) {
      setItems((prev) => reorderItems(prev, dragId, targetId, dragOverPos));
    }

    setDragId(null);
    setDragOverId(null);
  }

  function onDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  function renderRow(item: EnterpriseDepartmentItem, depth: number): React.ReactNode {
    const nodeChildren = childrenMap.get(item.id) || [];
    const hasChildren = nodeChildren.length > 0;
    const isExpanded = expanded.has(item.id);
    const isDragging = dragId === item.id;
    const isDropBefore = dragOverId === item.id && dragOverPos === 'before';
    const isDropAfter = dragOverId === item.id && dragOverPos === 'after';
    const canAddChild = activeTab === 'store' || depth < 2;
    const descendantCount = collectDescendantIds(currentItems, item.id).length;
    const metaParts = [
      `编码：${item.code}`,
      `负责人：${item.managerName || '未设置'}`,
      `编制：${item.headcount}人`,
      `更新：${item.updatedAt}`,
    ];

    const className = [
      styles.row,
      isDragging && styles.dragging,
      isDropBefore && styles.dropBefore,
      isDropAfter && styles.dropAfter,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div key={item.id}>
        <div
          className={className}
          style={{ paddingLeft: 16 + depth * 28 }}
          draggable
          onDragStart={(event) => onDragStart(event, item.id)}
          onDragOver={(event) => onDragOver(event, item.id)}
          onDrop={(event) => onDrop(event, item.id)}
          onDragEnd={onDragEnd}
        >
          <span className={styles.dragHandle}>
            <IconDragDotVertical />
          </span>
          <span
            className={styles.expandIcon}
            onClick={() => hasChildren && toggleExpand(item.id)}
          >
            {hasChildren ? (
              isExpanded ? <IconDown /> : <IconRight />
            ) : (
              <span className={styles.expandPlaceholder} />
            )}
          </span>
          <span className={styles.nodeContent}>
            <span className={styles.nodeName}>{item.name}</span>
            <span className={styles.nodeMeta}>{metaParts.join(' · ')}</span>
          </span>
          <span className={styles.nodeActions}>
            {canAddChild && (
              <Typography.Text
                className={styles.actionLink}
                onClick={() => openAddModal(item.id)}
              >
                新增子部门
              </Typography.Text>
            )}
            <Typography.Text
              className={styles.actionLink}
              onClick={() => openEditModal(item)}
            >
              编辑
            </Typography.Text>
            <Popconfirm
              title={`确定删除「${item.name}」${
                descendantCount ? `及其 ${descendantCount} 个下级部门` : ''
              }吗？`}
              onOk={() => handleDelete(item)}
            >
              <Typography.Text className={styles.actionLinkDanger}>
                删除
              </Typography.Text>
            </Popconfirm>
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div className={depth === 0 ? styles.childrenBg : ''}>
            {nodeChildren.map((child) => renderRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const currentParentPath = getDepartmentPathLabels(
    editingItem ? editingItem.parentId : addParentId
  );
  const parentDisplayText = currentParentPath.length
    ? currentParentPath.join(' / ')
    : '一级部门';
  const headerTitle =
    activeTab === 'store' && currentStoreLabel
      ? `部门信息（${currentStoreLabel}）`
      : '部门信息';
  const emptyText =
    activeTab === 'store'
      ? storeOptions.length
        ? '当前门店暂无部门数据'
        : '暂无可选门店，请先在组织管理中新增门店'
      : '暂无部门数据';
  const parentTipText =
    activeTab === 'store'
      ? `所属门店：${currentStoreLabel || '未选择门店'} · 所属层级：${parentDisplayText}`
      : `所属层级：${parentDisplayText}`;

  return (
    <div className={styles.page}>
      {!isStoreConfigDepartmentPage && (
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          onChange={(value) => {
            const nextTab = normalizeEnterpriseDepartmentTab(value);
            const nextSearch = resolvedStoreId
              ? `?tab=${nextTab}&storeId=${resolvedStoreId}`
              : `?tab=${nextTab}`;
            history.replace(`${location.pathname}${nextSearch}`);
          }}
        >
          {Object.entries(ENTERPRISE_DEPARTMENT_SCOPE_LABEL_MAP).map(([key, label]) => (
            <TabPane key={key} title={label} />
          ))}
        </Tabs>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarActions}>
          {activeTab === 'store' && !isStoreConfigDepartmentPage && (
            <div className={styles.storeFilter}>
              <span className={styles.storeFilterLabel}>选择门店</span>
              <Select
                className={styles.storeSelector}
                disabled={!storeOptions.length}
                placeholder="请选择门店"
                value={activeStoreId}
                onChange={(value) =>
                  history.replace(
                    `${location.pathname}?tab=store&storeId=${String(value)}`
                  )
                }
              >
                {storeOptions.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </div>
          )}
          <Button
            type="primary"
            icon={<IconPlus />}
            disabled={activeTab === 'store' && !activeStoreId}
            onClick={() => openAddModal(null)}
          >
            新增一级部门
          </Button>
          <Button onClick={handleToggleAll}>
            {allExpanded ? '收起全部' : '展开全部'}
          </Button>
        </div>
        <span className={styles.toolbarHint}>
          {activeTab === 'store' && currentStoreLabel
            ? `${currentStoreLabel}下共 ${currentItems.length} 个部门，一级部门 ${rootItems.length} 个`
            : `当前为${ENTERPRISE_DEPARTMENT_SCOPE_LABEL_MAP[activeTab]}部门，共 ${currentItems.length} 个，一级部门 ${rootItems.length} 个`}
        </span>
      </div>

      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <span className={styles.headerName}>{headerTitle}</span>
          <span className={styles.headerOps}>
            <Tooltip content="支持多级部门新增、编辑、删除和同级拖拽排序">
              <IconInfoCircle className={styles.headerInfoIcon} />
            </Tooltip>
            操作
          </span>
        </div>

        <div>
          {rootItems.length === 0 ? (
            <div className={styles.empty}>{emptyText}</div>
          ) : (
            rootItems.map((item) => renderRow(item, 0))
          )}
        </div>
      </div>

      <Modal
        title={editingItem ? '编辑部门' : addParentId ? '新增子部门' : '新增一级部门'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        style={{ width: 520 }}
        focusLock
        autoFocus={false}
      >
        <div className={styles.parentTip}>{parentTipText}</div>
        <Form
          form={form}
          className={styles.modalForm}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            field="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item
            field="code"
            label="部门编码"
            rules={[{ required: true, message: '请输入部门编码' }]}
          >
            <Input placeholder="请输入部门编码" maxLength={30} showWordLimit />
          </Form.Item>
          <Form.Item field="managerName" label="负责人">
            <Input placeholder="请输入负责人姓名" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item
            field="headcount"
            label="编制人数"
            rules={[{ required: true, message: '请输入编制人数' }]}
          >
            <InputNumber
              min={0}
              precision={0}
              placeholder="请输入编制人数"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item field="description" label="部门说明">
            <TextArea
              placeholder="请输入部门说明"
              maxLength={100}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default EnterpriseDepartmentPage;
