import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
  Message,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import {
  IconDragDotVertical,
  IconMinusCircle,
  IconPlus,
} from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './form-page.module.less';
import {
  PRODUCT_CATALOG_ATTRIBUTE_TYPE_COLORS,
  PRODUCT_CATALOG_ATTRIBUTE_TYPE_LABELS,
  getEnabledProductCatalogAttributes,
  getProductCatalogAttributeValueSummary,
  ProductCatalogAttributeItem,
  useProductCatalogAttributes,
} from '@/pages/product/attribute/data';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  useProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  isProductCatalogAttributeTemplateCatalogDuplicated,
  useProductCatalogAttributeTemplates,
} from './data';

const { useForm } = Form;

const FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '108px' },
  wrapperCol: { flex: '1' },
};

type TemplateDraftRow = {
  rowId: string;
  attributeId?: string;
  required: boolean;
  sort: number;
};

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function createTemplateId() {
  return `attr_template_${Date.now()}`;
}

function createDraftRowId() {
  return `attr_template_row_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createEmptyDraftRow(sort = 1): TemplateDraftRow {
  return {
    rowId: createDraftRowId(),
    attributeId: undefined,
    required: false,
    sort,
  };
}

function normalizePaths(
  value: (string | string[])[] | string[][] | undefined
): string[][] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  if (Array.isArray(value[0])) {
    return value as string[][];
  }

  return [value as string[]];
}

function normalizeDraftRows(rows: TemplateDraftRow[]) {
  return rows.map((item, index) => ({
    ...item,
    sort: index + 1,
  }));
}

function reorderDraftRows(
  entries: TemplateDraftRow[],
  dragId: string,
  targetId: string,
  position: 'before' | 'after'
) {
  const dragEntry = entries.find((item) => item.rowId === dragId);
  const targetEntry = entries.find((item) => item.rowId === targetId);

  if (!dragEntry || !targetEntry) {
    return entries;
  }

  const rest = entries.filter((item) => item.rowId !== dragId);
  const targetIndex = rest.findIndex((item) => item.rowId === targetId);
  const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
  const nextRows = [
    ...rest.slice(0, insertIndex),
    dragEntry,
    ...rest.slice(insertIndex),
  ];

  return normalizeDraftRows(nextRows);
}

function renderAttributeConfig(attribute?: ProductCatalogAttributeItem) {
  if (!attribute) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  if (attribute.type === 'text' || attribute.type === 'number') {
    return (
      <Typography.Text type="secondary">
        {getProductCatalogAttributeValueSummary(attribute)}
      </Typography.Text>
    );
  }

  if (!attribute.values.length) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  return (
    <div className={styles.previewValueList}>
      {attribute.values.map((value) => (
        <Tag key={value} size="small">
          {value}
        </Tag>
      ))}
    </div>
  );
}

function AttributeTemplateFormPage() {
  const history = useHistory();
  const location = useLocation();
  const [form] = useForm();
  const [catalogItems] = useProductCatalogItems();
  const [attributes] = useProductCatalogAttributes();
  const [templates, setTemplates] = useProductCatalogAttributeTemplates(attributes);
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const editingId =
    typeof locationQuery.id === 'string' ? locationQuery.id : undefined;
  const editingItem = useMemo(
    () => templates.find((item) => item.id === editingId),
    [editingId, templates]
  );
  const catalogCascaderOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const enabledAttributes = useMemo(
    () => getEnabledProductCatalogAttributes(attributes),
    [attributes]
  );
  const enabledAttributeMap = useMemo(
    () => new Map(enabledAttributes.map((item) => [item.id, item])),
    [enabledAttributes]
  );
  const [draftRows, setDraftRows] = useState<TemplateDraftRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');
  const editingStateKey = editingItem
    ? JSON.stringify({
        id: editingItem.id,
        name: editingItem.name,
        catalogIds: editingItem.catalogIds,
        enabled: editingItem.enabled,
        entries: editingItem.entries,
      })
    : '__create__';
  const catalogItemsKey = catalogItems
    .map((item) => `${item.id}:${item.parentId || 'root'}:${item.name}`)
    .join('|');

  useEffect(() => {
    const initialDraftRows = (editingItem?.entries || []).flatMap((entry, index) => {
      if (!enabledAttributeMap.has(entry.attributeId)) {
        return [];
      }

      return [
        {
          rowId: createDraftRowId(),
          attributeId: entry.attributeId,
          required: entry.required === true,
          sort: index + 1,
        },
      ];
    });

    form.setFieldsValue({
      name: editingItem?.name,
      catalogIds: editingItem?.catalogIds.map((catalogId) =>
        getProductCatalogPathById(catalogId, catalogItems)
      ),
      enabled: editingItem?.enabled ?? true,
    });
    setDraftRows(initialDraftRows.length ? initialDraftRows : [createEmptyDraftRow()]);
  }, [catalogItemsKey, editingStateKey, editingItem, enabledAttributeMap, form]);

  const draftTableData = useMemo(
    () =>
      draftRows.map((row) => ({
        ...row,
        attribute: row.attributeId ? enabledAttributeMap.get(row.attributeId) : undefined,
      })),
    [draftRows, enabledAttributeMap]
  );

  const canAddDraftRow = enabledAttributes.length > 0 && draftRows.length < enabledAttributes.length;

  function handleAddAttributeRow() {
    setDraftRows((prev) =>
      normalizeDraftRows([
        ...prev,
        createEmptyDraftRow(prev.length + 1),
      ])
    );
  }

  function handleAttributeChange(rowId: string, value: string | number | undefined) {
    setDraftRows((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              attributeId: typeof value === 'string' ? value : undefined,
            }
          : item
      )
    );
  }

  function handleRemoveAttribute(rowId: string) {
    setDraftRows((prev) =>
      normalizeDraftRows(prev.filter((item) => item.rowId !== rowId))
    );
  }

  function handleRequiredChange(rowId: string, required: boolean) {
    setDraftRows((prev) =>
      prev.map((item) => (item.rowId === rowId ? { ...item, required } : item))
    );
  }

  function isAttributeSelectedInOtherRows(rowId: string, attributeId: string) {
    return draftRows.some(
      (item) => item.rowId !== rowId && item.attributeId === attributeId
    );
  }

  function handleDragStart(
    event: React.DragEvent<HTMLElement>,
    rowId: string
  ) {
    setDragId(rowId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rowId);
  }

  function handleDragOver(
    event: React.DragEvent<HTMLTableRowElement>,
    rowId: string
  ) {
    event.preventDefault();

    if (!dragId || dragId === rowId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setDragOverId(rowId);
    setDragOverPos(
      event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    );
  }

  function handleDrop(
    event: React.DragEvent<HTMLTableRowElement>,
    targetRowId: string
  ) {
    event.preventDefault();

    if (dragId && dragId !== targetRowId) {
      setDraftRows((prev) =>
        reorderDraftRows(prev, dragId, targetRowId, dragOverPos)
      );
    }

    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  async function handleSubmit() {
    try {
      const values = await form.validate();
      const catalogPaths = normalizePaths(values.catalogIds);
      const catalogIds = catalogPaths
        .map((path) => getProductCatalogIdFromPath(path, catalogItems))
        .filter(Boolean) as string[];

      if (!catalogIds.length) {
        Message.warning('请选择叶子类目');
        return;
      }

      if (catalogIds.length !== catalogPaths.length) {
        Message.warning('只能绑定叶子类目');
        return;
      }

      if (!draftRows.length) {
        Message.warning('请至少选择一个字段');
        return;
      }

      if (draftRows.some((item) => !item.attributeId)) {
        Message.warning('请先为所有行选择属性字段');
        return;
      }

      const selectedAttributeIds = draftRows
        .map((item) => item.attributeId)
        .filter((item): item is string => Boolean(item));

      if (selectedAttributeIds.length !== new Set(selectedAttributeIds).size) {
        Message.warning('属性字段不能重复');
        return;
      }

      if (selectedAttributeIds.some((attributeId) => !enabledAttributeMap.has(attributeId))) {
        Message.warning('存在不可用字段，请重新选择');
        return;
      }

      if (
        isProductCatalogAttributeTemplateCatalogDuplicated(
          templates,
          catalogIds,
          editingItem?.id
        )
      ) {
        Message.warning('同一类目只能绑定一个模板');
        return;
      }

      const nextEntries = normalizeDraftRows(draftRows).map((item, index) => ({
        attributeId: item.attributeId as string,
        required: item.required,
        sort: index + 1,
      }));

      if (editingItem) {
        setTemplates((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: values.name.trim(),
                  catalogIds,
                  entries: nextEntries,
                  enabled: values.enabled ?? true,
                }
              : item
          )
        );
        Message.success('模板修改成功');
      } else {
        setTemplates((prev) => [
          ...prev,
          {
            id: createTemplateId(),
            name: values.name.trim(),
            catalogIds,
            entries: nextEntries,
            enabled: values.enabled ?? true,
            createdAt: now(),
          },
        ]);
        Message.success('模板创建成功');
      }

      history.push('/product-config/attribute-template');
    } catch (_) {
      // validation failed
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.formCard}>
        <div className={styles.pageHeader}>
          <Typography.Title heading={6} className={styles.pageTitle}>
            {editingItem ? '编辑类目属性模板' : '新建类目属性模板'}
          </Typography.Title>
        </div>

        <Form form={form} {...FORM_LAYOUT} className={styles.templateForm}>
          <Form.Item
            field="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input className={styles.formControl} placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item
            field="catalogIds"
            label="绑定类目"
            rules={[{ required: true, message: '请选择绑定类目' }]}
          >
            <Cascader
              mode="multiple"
              className={styles.formControl}
              options={catalogCascaderOptions}
              placeholder="请选择绑定类目"
            />
          </Form.Item>
          <Form.Item field="enabled" label="状态" initialValue={true}>
            <Switch checkedText="启用" uncheckedText="禁用" />
          </Form.Item>
        </Form>

        <div className={styles.selectorRow}>
          <Typography.Text className={styles.selectorLabel}>属性字段</Typography.Text>
          <div className={styles.selectorActions}>
            {!enabledAttributes.length && (
              <Typography.Text type="secondary">暂无已启用属性字段</Typography.Text>
            )}
          </div>
        </div>

        <Table
          rowKey="rowId"
          className={styles.attributeTable}
          columns={[
            {
              title: '',
              dataIndex: 'drag',
              width: 64,
              render: (_: unknown, record: TemplateDraftRow) => (
                <span
                  className={styles.dragHandle}
                  draggable
                  onDragStart={(event) => handleDragStart(event, record.rowId)}
                  onDragEnd={handleDragEnd}
                >
                  <IconDragDotVertical />
                </span>
              ),
            },
            {
              title: '属性名',
              dataIndex: 'attributeId',
              width: 280,
              render: (value: string | undefined, record: TemplateDraftRow) => (
                <Select
                  allowClear
                  showSearch
                  placeholder="请选择属性字段"
                  className={styles.attributeSelect}
                  value={value}
                  onChange={(nextValue) =>
                    handleAttributeChange(
                      record.rowId,
                      typeof nextValue === 'string' || typeof nextValue === 'number'
                        ? nextValue
                        : undefined
                    )
                  }
                >
                  {enabledAttributes.map((item) => (
                    <Select.Option
                      key={item.id}
                      value={item.id}
                      disabled={isAttributeSelectedInOtherRows(record.rowId, item.id)}
                    >
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              ),
            },
            {
              title: '属性类型',
              dataIndex: 'attribute',
              width: 140,
              render: (_: unknown, record: TemplateDraftRow & { attribute?: ProductCatalogAttributeItem }) =>
                record.attribute ? (
                  <Tag color={PRODUCT_CATALOG_ATTRIBUTE_TYPE_COLORS[record.attribute.type]}>
                    {PRODUCT_CATALOG_ATTRIBUTE_TYPE_LABELS[record.attribute.type]}
                  </Tag>
                ) : (
                  <Typography.Text type="secondary">-</Typography.Text>
                ),
            },
            {
              title: '属性字段配置',
              dataIndex: 'config',
              render: (_: unknown, record: TemplateDraftRow & { attribute?: ProductCatalogAttributeItem }) =>
                renderAttributeConfig(record.attribute),
            },
            {
              title: '是否必填',
              dataIndex: 'required',
              width: 180,
              render: (value: boolean, record: TemplateDraftRow) => (
                <Switch
                  checked={value}
                  checkedText="必填"
                  uncheckedText="选填"
                  onChange={(checked) => handleRequiredChange(record.rowId, checked)}
                />
              ),
            },
            {
              title: '操作',
              dataIndex: 'actions',
              width: 120,
              render: (_: unknown, record: TemplateDraftRow) => (
                <Button
                  status="danger"
                  type="text"
                  icon={<IconMinusCircle />}
                  onClick={() => handleRemoveAttribute(record.rowId)}
                >
                  移除
                </Button>
              ),
            },
          ]}
          data={draftTableData}
          pagination={false}
          scroll={{ x: 980 }}
          noDataElement={
            <div className={styles.emptyState}>暂无属性字段，请点击添加属性</div>
          }
          rowClassName={(record: TemplateDraftRow) => {
            const isDragging = dragId === record.rowId;
            const isDropBefore =
              dragOverId === record.rowId && dragOverPos === 'before';
            const isDropAfter =
              dragOverId === record.rowId && dragOverPos === 'after';

            return [
              isDragging && styles.draggingRow,
              isDropBefore && styles.dropBeforeRow,
              isDropAfter && styles.dropAfterRow,
            ]
              .filter(Boolean)
              .join(' ');
          }}
          onRow={(record: TemplateDraftRow) => ({
            onDragOver: (event) => handleDragOver(event, record.rowId),
            onDrop: (event) => handleDrop(event, record.rowId),
          })}
        />

        <div className={styles.tableFooterActions}>
          <div className={styles.selectorLabel} />
          <Button
            type="secondary"
            icon={<IconPlus />}
            disabled={!canAddDraftRow}
            onClick={handleAddAttributeRow}
          >
            添加属性
          </Button>
        </div>

        <div className={styles.pageActions}>
          <Button onClick={() => history.push('/product-config/attribute-template')}>
            返回列表
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            保存模板
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default AttributeTemplateFormPage;
