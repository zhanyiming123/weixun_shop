import React, { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Message,
  Modal,
  Popconfirm,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconDown,
  IconDragDotVertical,
  IconInfoCircle,
  IconPlus,
  IconRight,
  IconSearch,
} from '@arco-design/web-react/icon';
import styles from './index.module.less';

const { useForm } = Form;

interface CategoryItem {
  id: string;
  name: string;
  parentId: string | null;
}

const INITIAL_ITEMS: CategoryItem[] = [
  { id: 'C001', name: '服装', parentId: null },
  { id: 'C002', name: '男装', parentId: 'C001' },
  { id: 'C009', name: 'T恤', parentId: 'C002' },
  { id: 'C010', name: '衬衫', parentId: 'C002' },
  { id: 'C003', name: '女装', parentId: 'C001' },
  { id: 'C004', name: '童装', parentId: 'C001' },
  { id: 'C005', name: '数码', parentId: null },
  { id: 'C006', name: '手机', parentId: 'C005' },
  { id: 'C007', name: '电脑', parentId: 'C005' },
  { id: 'C008', name: '家居', parentId: null },
];

let counter = 11;

function genId() {
  return `C${String(counter++).padStart(3, '0')}`;
}

function reorderItems(
  items: CategoryItem[],
  dragId: string,
  targetId: string,
  pos: 'before' | 'after'
): CategoryItem[] {
  const drag = items.find((i) => i.id === dragId);
  const target = items.find((i) => i.id === targetId);
  if (!drag || !target || drag.parentId !== target.parentId) return items;

  const pid = drag.parentId;
  const siblings = items.filter((i) => i.parentId === pid);
  const rest = siblings.filter((i) => i.id !== dragId);
  const tIdx = rest.findIndex((i) => i.id === targetId);
  const insertAt = pos === 'after' ? tIdx + 1 : tIdx;
  const reordered = [...rest.slice(0, insertAt), drag, ...rest.slice(insertAt)];

  const iter = reordered[Symbol.iterator]();
  return items.map((item) =>
    item.parentId === pid ? (iter.next().value as CategoryItem) : item
  );
}

function removeWithDescendants(items: CategoryItem[], id: string): CategoryItem[] {
  const toRemove = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId !== null && toRemove.has(item.parentId) && !toRemove.has(item.id)) {
        toRemove.add(item.id);
        changed = true;
      }
    }
  }
  return items.filter((i) => !toRemove.has(i.id));
}

const MAX_DEPTH = 2;

function CategoryPage() {
  const [items, setItems] = useState<CategoryItem[]>(INITIAL_ITEMS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['C001', 'C005']));
  const [searchText, setSearchText] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [form] = useForm();

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, CategoryItem[]>();
    for (const item of items) {
      const k = item.parentId;
      if (!map.has(k)) map.set(k, []);
      const group = map.get(k);
      if (group) {
        group.push(item);
      }
    }
    return map;
  }, [items]);

  const searchResults = useMemo(() => {
    const q = searchText.trim();
    if (!q) return null;
    return items.filter((i) => i.name.includes(q));
  }, [items, searchText]);

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
    setModalVisible(true);
  }

  function openEditModal(item: CategoryItem) {
    setEditingItem(item);
    setAddParentId(null);
    form.setFieldsValue({ name: item.name });
    setModalVisible(true);
  }

  async function handleModalOk() {
    try {
      const values = await form.validate();
      if (editingItem) {
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, name: values.name } : i))
        );
        Message.success('修改成功');
      } else {
        const newItem: CategoryItem = { id: genId(), name: values.name, parentId: addParentId };
        setItems((prev) => [...prev, newItem]);
        if (addParentId) {
          setExpanded((prev) => new Set([...prev, addParentId]));
        }
        Message.success('添加成功');
      }
      setModalVisible(false);
    } catch (_) {
      // validation error
    }
  }

  function handleDelete(item: CategoryItem) {
    setItems((prev) => removeWithDescendants(prev, item.id));
    Message.success('删除成功');
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

  function renderRow(item: CategoryItem, depth: number) {
    const nodeChildren = childrenMap.get(item.id) || [];
    const hasChildren = nodeChildren.length > 0;
    const isExpanded = expanded.has(item.id);
    const isDragging = dragId === item.id;
    const isDropBefore = dragOverId === item.id && dragOverPos === 'before';
    const isDropAfter = dragOverId === item.id && dragOverPos === 'after';
    const canAddChild = depth < MAX_DEPTH;
    const isSearchMode = searchResults !== null;

    const cls = [
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
          className={cls}
          style={{ paddingLeft: 16 + depth * 28 }}
          draggable={!isSearchMode}
          onDragStart={(e) => !isSearchMode && onDragStart(e, item.id)}
          onDragOver={(e) => !isSearchMode && onDragOver(e, item.id)}
          onDrop={(e) => !isSearchMode && onDrop(e, item.id)}
          onDragEnd={() => !isSearchMode && onDragEnd()}
        >
          {!isSearchMode && (
            <span className={styles.dragHandle}>
              <IconDragDotVertical />
            </span>
          )}
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
          <span className={styles.nodeName}>{item.name}</span>
          <span className={styles.nodeActions}>
            {canAddChild && (
              <Typography.Text className={styles.actionLink} onClick={() => openAddModal(item.id)}>
                新增子分类
              </Typography.Text>
            )}
            <Typography.Text className={styles.actionLink} onClick={() => openEditModal(item)}>
              编辑
            </Typography.Text>
            <Popconfirm
              title={`确定删除「${item.name}」${hasChildren ? '及其所有子分类' : ''}吗？`}
              onOk={() => handleDelete(item)}
            >
              <Typography.Text className={styles.actionLinkDanger}>删除</Typography.Text>
            </Popconfirm>
          </span>
        </div>
        {isExpanded && hasChildren && !isSearchMode && (
          <div className={depth === 0 ? styles.childrenBg : ''}>
            {nodeChildren.map((child) => renderRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const rootItems = childrenMap.get(null) || [];
  const displayItems = searchResults ?? rootItems;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Button type="primary" icon={<IconPlus />} onClick={() => openAddModal(null)}>
          新增分类
        </Button>
        <Button onClick={() => Message.info('导入功能暂未实现')}>导入分类</Button>
        <Button onClick={() => Message.info('导出功能暂未实现')}>导出分类</Button>
        <Typography.Text
          className={styles.toolbarLink}
          onClick={() => Message.info('查看已导出列表暂未实现')}
        >
          查看已导出列表
        </Typography.Text>
        <span className={styles.spacer} />
        <Input
          className={styles.searchInput}
          prefix={<IconSearch />}
          placeholder="搜索分类名称"
          allowClear
          value={searchText}
          onChange={setSearchText}
        />
      </div>

      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <span className={styles.headerName}>分类</span>
          <span className={styles.headerOps}>
            <Tooltip content="可对分类进行新增、编辑、删除操作，同级分类支持拖拽排序">
              <IconInfoCircle className={styles.headerInfoIcon} />
            </Tooltip>
            操作
          </span>
        </div>

        <div>
          {displayItems.length === 0 ? (
            <div className={styles.empty}>暂无分类数据</div>
          ) : (
            displayItems.map((item) => renderRow(item, 0))
          )}
        </div>

        <div className={styles.systemNode}>
          <div className={styles.systemName}>未分类</div>
          <div className={styles.systemDesc}>系统预设分类，不可编辑和删除</div>
        </div>
      </div>

      <Modal
        title={editingItem ? '编辑分类' : addParentId ? '新增子分类' : '新增分类'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        style={{ width: 440 }}
        focusLock
        autoFocus={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            field="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" maxLength={20} showWordLimit />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CategoryPage;
