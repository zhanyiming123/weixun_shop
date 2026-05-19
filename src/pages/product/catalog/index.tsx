import React, { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Switch,
  Tag,
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
import styles from './index.module.less';
import {
  ProductCatalogConfigItem,
  readProductCatalogItems,
  useProductCatalogItems,
} from './data';

const { useForm } = Form;

function reorderItems(
  items: ProductCatalogConfigItem[],
  dragId: string,
  targetId: string,
  pos: 'before' | 'after'
): ProductCatalogConfigItem[] {
  const drag = items.find((i) => i.id === dragId);
  const target = items.find((i) => i.id === targetId);
  if (!drag || !target || drag.parentId !== target.parentId) return items;

  const pid = drag.parentId;
  const siblings = items.filter((i) => i.parentId === pid);
  const rest = siblings.filter((i) => i.id !== dragId);
  const tIdx = rest.findIndex((i) => i.id === targetId);
  const insertAt = pos === 'after' ? tIdx + 1 : tIdx;
  const reorderedItems = [...rest.slice(0, insertAt), drag, ...rest.slice(insertAt)];
  const reordered = reorderedItems.map((item, index) => ({
    ...item,
    sort: reorderedItems.length - index,
  }));

  const iter = reordered[Symbol.iterator]();
  return items.map((item) =>
    item.parentId === pid ? (iter.next().value as ProductCatalogConfigItem) : item
  );
}

function CatalogPage() {
  const [items, setItems] = useProductCatalogItems();
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        readProductCatalogItems()
          .filter((item) => item.parentId === null)
          .map((item) => item.id)
      )
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductCatalogConfigItem | null>(
    null
  );
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [form] = useForm();

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, ProductCatalogConfigItem[]>();
    for (const item of items) {
      const k = item.parentId;
      if (!map.has(k)) map.set(k, []);
      const group = map.get(k);
      if (group) {
        group.push(item);
      }
    }

    map.forEach((group, key) => {
      map.set(
        key,
        [...group].sort((left, right) => (right.sort || 0) - (left.sort || 0))
      );
    });

    return map;
  }, [items]);

  const parentDisplayName = useMemo(() => {
    const currentParentId = editingItem?.parentId ?? addParentId;

    if (!currentParentId) {
      return editingItem ? '无' : '';
    }

    const labelPath: string[] = [];
    let currentId: string | null = currentParentId;

    while (currentId) {
      const currentItem = itemMap.get(currentId);
      if (!currentItem) {
        break;
      }

      labelPath.unshift(currentItem.name);
      currentId = currentItem.parentId;
    }

    return labelPath.join(' / ');
  }, [addParentId, editingItem, itemMap]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openAddModal(parentId: string | null) {
    setEditingItem(null);
    setAddParentId(parentId);
    form.resetFields();
    form.setFieldsValue({
      sort: 0,
      enabled: true,
    });
    setModalVisible(true);
  }

  function openEditModal(item: ProductCatalogConfigItem) {
    setEditingItem(item);
    setAddParentId(null);
    form.setFieldsValue({
      name: item.name,
      sort: item.sort,
      enabled: item.enabled !== false,
    });
    setModalVisible(true);
  }

  async function handleModalOk() {
    try {
      const values = await form.validate();
      if (editingItem) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? {
                  ...i,
                  name: values.name,
                  sort: values.sort,
                  enabled: values.enabled ?? true,
                }
              : i
          )
        );
        Message.success('修改成功');
      } else {
        const newItem: ProductCatalogConfigItem = {
          id: `catalog_${Date.now()}`,
          name: values.name,
          parentId: addParentId,
          hasSkuSpec: false,
          sort: values.sort,
          enabled: values.enabled ?? true,
        };
        setItems((prev) => [...prev, newItem]);
        if (addParentId) {
          setExpanded((prev) => {
            const next = new Set(prev);
            next.add(addParentId);
            return next;
          });
        }
        Message.success('添加成功');
      }
      setModalVisible(false);
    } catch (_) {
      // validation error
    }
  }

  function handleToggleEnabled(item: ProductCatalogConfigItem, checked: boolean) {
    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, enabled: checked } : current
      )
    );
    Message.success(`${item.name}已${checked ? '启用' : '禁用'}`);
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOverId(id);
    setDragOverPos(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
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

  function renderRow(item: ProductCatalogConfigItem, depth: number) {
    const nodeChildren = childrenMap.get(item.id) || [];
    const hasChildren = nodeChildren.length > 0;
    const isExpanded = expanded.has(item.id);
    const isDragging = dragId === item.id;
    const isDropBefore = dragOverId === item.id && dragOverPos === 'before';
    const isDropAfter = dragOverId === item.id && dragOverPos === 'after';
    const isEnabled = item.enabled !== false;

    const cls = [
      styles.row,
      !isEnabled && styles.rowDisabled,
      isDragging && styles.dragging,
      isDropBefore && styles.dropBefore,
      isDropAfter && styles.dropAfter,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div key={item.id}>
        <div
          className={cls}
          draggable
          onDragStart={(e) => onDragStart(e, item.id)}
          onDragOver={(e) => onDragOver(e, item.id)}
          onDrop={(e) => onDrop(e, item.id)}
          onDragEnd={onDragEnd}
        >
          <span className={styles.nameCell} style={{ paddingLeft: depth * 28 }}>
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
            <span className={styles.nodeName}>
              {item.name}
              {!isEnabled && <span className={styles.nodeStatus}>已禁用</span>}
            </span>
          </span>
          <span className={styles.nodeSort}>{item.sort || '-'}</span>
          <span className={styles.nodeStatusCell}>
            <Tag color={isEnabled ? 'green' : 'red'}>{isEnabled ? '启用' : '禁用'}</Tag>
          </span>
          <span className={styles.nodeActions}>
            <Typography.Text className={styles.actionLink} onClick={() => openAddModal(item.id)}>
              新增子类目
            </Typography.Text>
            <Typography.Text className={styles.actionLink} onClick={() => openEditModal(item)}>
              编辑
            </Typography.Text>
            {isEnabled ? (
              <Popconfirm
                title={`确定禁用「${item.name}」吗？`}
                onOk={() => handleToggleEnabled(item, false)}
              >
                <Typography.Text className={styles.actionLink}>禁用</Typography.Text>
              </Popconfirm>
            ) : (
              <Typography.Text
                className={styles.actionLink}
                onClick={() => handleToggleEnabled(item, true)}
              >
                启用
              </Typography.Text>
            )}
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

  const rootItems = childrenMap.get(null) || [];

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Button type="primary" icon={<IconPlus />} onClick={() => openAddModal(null)}>
          新增类目
        </Button>
      </div>

      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <span className={styles.headerName}>类目</span>
          <span className={styles.headerSort}>
            排序
            <Tooltip content="序号越大，显示越靠前">
              <IconInfoCircle className={styles.headerInfoIcon} />
            </Tooltip>
          </span>
          <span className={styles.headerStatus}>状态</span>
          <span className={styles.headerOps}>
            <Tooltip content="可对类目进行新增、编辑、启用/禁用操作，同级类目支持拖拽排序">
              <IconInfoCircle className={styles.headerInfoIcon} />
            </Tooltip>
            操作
          </span>
        </div>

        <div>
          {rootItems.length === 0 ? (
            <div className={styles.empty}>暂无类目数据</div>
          ) : (
            rootItems.map((item) => renderRow(item, 0))
          )}
        </div>

      </div>

      <Modal
        title={editingItem ? '编辑类目' : addParentId ? '新增子类目' : '新增类目'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        style={{ width: 440 }}
        focusLock
        autoFocus={false}
      >
        <Form className="platform-form-spacing" form={form} layout="vertical">
          {(addParentId || editingItem) && (
            <Form.Item label="父类目">
              <Input value={parentDisplayName} disabled />
            </Form.Item>
          )}
          <Form.Item
            field="name"
            label="类目名称"
            rules={[{ required: true, message: '请输入类目名称' }]}
          >
            <Input placeholder="请输入类目名称" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item
            field="sort"
            label="排序"
            initialValue={0}
            rules={[{ required: true, message: '请输入排序值' }]}
          >
            <InputNumber
              min={0}
              max={999}
              placeholder="数值越大越靠前"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            field="enabled"
            label="状态"
            initialValue={true}
            triggerPropName="checked"
          >
            <Switch checkedText="启用" uncheckedText="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CatalogPage;
