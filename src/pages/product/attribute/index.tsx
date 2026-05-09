import React, { useMemo, useState } from 'react';
import {
  Button,
  Cascader,
  Card,
  Form,
  Input,
  InputNumber,
  InputTag,
  Message,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import styles from './index.module.less';
import {
  buildProductCatalogCascaderOptions,
  buildProductCatalogLeafItems,
  getProductCatalogFullLabel,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  useProductCatalogItems,
} from '../catalog/data';
import {
  ProductCatalogAttributeItem,
  ProductCatalogAttributeNumberMode,
  ProductCatalogAttributeType,
  getProductCatalogAttributeValueSummary,
  useProductCatalogAttributes,
} from './data';

const { useForm } = Form;

function generateId() {
  return `attr_${Date.now()}`;
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const TYPE_COLORS: Record<ProductCatalogAttributeType, string> = {
  text: 'gray',
  number: 'gold',
  single: 'arcoblue',
  multi: 'green',
};

const TYPE_LABELS: Record<ProductCatalogAttributeType, string> = {
  text: '文本',
  number: '数字',
  single: '单选',
  multi: '多选',
};

function normalizePath(value: (string | string[])[] | undefined): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
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

function getPositiveIntegerRule(message: string) {
  return {
    validator: (value: unknown, callback: (error?: string) => void) => {
      if (value === undefined || value === null || value === '') {
        callback();
        return;
      }

      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        Number.isInteger(value) &&
        value > 0
      ) {
        callback();
        return;
      }

      callback(message);
    },
  };
}

function getNonNegativeIntegerRule(message: string) {
  return {
    validator: (value: unknown, callback: (error?: string) => void) => {
      if (value === undefined || value === null || value === '') {
        callback();
        return;
      }

      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        Number.isInteger(value) &&
        value >= 0
      ) {
        callback();
        return;
      }

      callback(message);
    },
  };
}

function AttributePage() {
  const [catalogItems] = useProductCatalogItems();
  const [attributes, setAttributes] = useProductCatalogAttributes();
  const catalogLeafItems = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const catalogCascaderOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [searchName, setSearchName] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductCatalogAttributeItem | null>(
    null
  );
  const [form] = useForm();
  const [formType, setFormType] = useState<ProductCatalogAttributeType>('text');
  const [formNumberMode, setFormNumberMode] =
    useState<ProductCatalogAttributeNumberMode>('integer');

  const filteredData = useMemo(
    () =>
      attributes
        .filter((item) => {
          if (selectedCatalogId && !item.catalogIds.includes(selectedCatalogId)) {
            return false;
          }
          if (searchName && !item.name.includes(searchName)) {
            return false;
          }
          if (filterEnabled === 'true' && !item.enabled) {
            return false;
          }
          if (filterEnabled === 'false' && item.enabled) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.sort - b.sort),
    [attributes, filterEnabled, searchName, selectedCatalogId]
  );

  const selectedCatalog = catalogLeafItems.find((item) => item.id === selectedCatalogId);

  function openAddModal() {
    setEditingItem(null);
    setFormType('text');
    setFormNumberMode('integer');
    form.resetFields();
    form.setFieldsValue({
      catalogIds: selectedCatalogId
        ? [getProductCatalogPathById(selectedCatalogId, catalogItems)]
        : [],
      required: false,
      sort: 1,
      enabled: true,
      type: 'text',
      textMaxLength: undefined,
      numberMode: 'integer',
      numberPrecision: undefined,
    });
    setModalVisible(true);
  }

  function openEditModal(record: ProductCatalogAttributeItem) {
    setEditingItem(record);
    setFormType(record.type);
    setFormNumberMode(record.numberMode || 'integer');
    form.setFieldsValue({
      catalogIds: record.catalogIds.map((id) =>
        getProductCatalogPathById(id, catalogItems)
      ),
      name: record.name,
      type: record.type,
      values: record.values,
      textMaxLength: record.textMaxLength,
      numberMode: record.numberMode || 'integer',
      numberPrecision: record.numberPrecision,
      required: record.required,
      sort: record.sort,
      enabled: record.enabled,
    });
    setModalVisible(true);
  }

  function handleDelete(record: ProductCatalogAttributeItem) {
    setAttributes((prev) => prev.filter((item) => item.id !== record.id));
    Message.success('删除成功');
  }

  function handleToggleEnabled(record: ProductCatalogAttributeItem, checked: boolean) {
    setAttributes((prev) =>
      prev.map((item) =>
        item.id === record.id ? { ...item, enabled: checked } : item
      )
    );
    Message.success(`${record.name}已${checked ? '启用' : '禁用'}`);
  }

  async function handleModalOk() {
    try {
      const values = await form.validate();
      const catalogIds = normalizePaths(values.catalogIds)
        .map((path) => getProductCatalogIdFromPath(path, catalogItems))
        .filter(Boolean) as string[];
      const type = values.type as ProductCatalogAttributeType;
      const numberMode = values.numberMode as ProductCatalogAttributeNumberMode | undefined;
      const attributeValues =
        type === 'single' || type === 'multi' ? values.values || [] : [];
      const textMaxLength =
        type === 'text' && typeof values.textMaxLength === 'number'
          ? values.textMaxLength
          : undefined;
      const normalizedNumberMode =
        type === 'number'
          ? numberMode === 'decimalAllowed'
            ? 'decimalAllowed'
            : 'integer'
          : undefined;
      const numberPrecision =
        type === 'number' &&
        normalizedNumberMode === 'decimalAllowed' &&
        typeof values.numberPrecision === 'number'
          ? values.numberPrecision
          : undefined;

      if (editingItem) {
        setAttributes((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  catalogIds,
                  name: values.name,
                  type,
                  values: attributeValues,
                  textMaxLength,
                  numberMode: normalizedNumberMode,
                  numberPrecision,
                  required: values.required ?? false,
                  sort: values.sort,
                  enabled: values.enabled ?? true,
                }
              : item
          )
        );
        Message.success('修改成功');
      } else {
        setAttributes((prev) => [
          ...prev,
          {
            id: generateId(),
              catalogIds,
              name: values.name,
              type,
              values: attributeValues,
              textMaxLength,
              numberMode: normalizedNumberMode,
              numberPrecision,
              required: values.required ?? false,
              sort: values.sort,
              enabled: values.enabled ?? true,
              createdAt: now(),
            },
        ]);
        setSelectedCatalogId(catalogIds[0] || selectedCatalogId);
        Message.success('添加成功');
      }

      setModalVisible(false);
    } catch (_) {
      // validation failed
    }
  }

  const columns = [
    {
      title: '属性名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string) => <Typography.Text bold>{value}</Typography.Text>,
    },
    {
      title: '商品类目',
      dataIndex: 'catalogIds',
      width: 260,
      render: (catalogIds: string[]) => (
        <div className={styles.valueList}>
          {catalogIds.map((id) => (
            <Tag key={id} size="small">
              {getProductCatalogFullLabel(id, catalogItems)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '属性类型',
      dataIndex: 'type',
      width: 120,
      render: (value: ProductCatalogAttributeType) => (
        <Tag color={TYPE_COLORS[value]}>{TYPE_LABELS[value]}</Tag>
      ),
    },
    {
      title: '属性值',
      dataIndex: 'values',
      width: 300,
      render: (values: string[], record: ProductCatalogAttributeItem) => {
        if (record.type === 'text' || record.type === 'number') {
          return (
            <span className={styles.textType}>
              {getProductCatalogAttributeValueSummary(record)}
            </span>
          );
        }

        if (!values.length) {
          return '-';
        }

        return (
          <div className={styles.valueList}>
            {values.map((value) => (
              <Tag key={value} size="small">
                {value}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '是否必填',
      dataIndex: 'required',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'red' : 'gray'}>{value ? '必填' : '选填'}</Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      width: 90,
      sorter: (a: ProductCatalogAttributeItem, b: ProductCatalogAttributeItem) =>
        a.sort - b.sort,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (value: boolean, record: ProductCatalogAttributeItem) => (
        <Switch
          checked={value}
          checkedText="启用"
          uncheckedText="禁用"
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductCatalogAttributeItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text className={styles.actionLink} onClick={() => openEditModal(record)}>
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          <Popconfirm title={`确定删除属性「${record.name}」吗？`} onOk={() => handleDelete(record)}>
            <Typography.Text className={styles.actionLinkDanger}>删除</Typography.Text>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>商品类目</span>
            <Cascader
              allowClear
              className={styles.catalogCascader}
              options={catalogCascaderOptions}
              placeholder="请选择商品类目"
              value={
                selectedCatalogId
                  ? getProductCatalogPathById(selectedCatalogId, catalogItems)
                  : undefined
              }
              onChange={(value) =>
                setSelectedCatalogId(
                  getProductCatalogIdFromPath(normalizePath(value), catalogItems) || ''
                )
              }
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>属性名称</span>
            <Input
              allowClear
              placeholder="请输入属性名称"
              style={{ width: 200 }}
              value={searchName}
              onChange={setSearchName}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>状态</span>
            <Select
              allowClear
              placeholder="请选择状态"
              style={{ width: 140 }}
              value={filterEnabled || undefined}
              onChange={(value) => setFilterEnabled(value || '')}
            >
              <Select.Option value="true">启用</Select.Option>
              <Select.Option value="false">禁用</Select.Option>
            </Select>
          </div>
          <div className={styles.filterActions}>
            <Button type="primary">查询</Button>
            <Button
              onClick={() => {
                setSearchName('');
                setFilterEnabled('');
              }}
            >
              重置
            </Button>
          </div>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <Typography.Text className={styles.categoryTitle}>
              当前类目：
              <Typography.Text bold>{selectedCatalog?.label || '全部类目'}</Typography.Text>
            </Typography.Text>
          </div>
          <Button icon={<IconPlus />} type="primary" onClick={openAddModal}>
            添加属性
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          data={filteredData}
          noDataElement="暂无属性数据"
          pagination={{ pageSize: 10, showTotal: true }}
          scroll={{ x: 1560 }}
          tableLayoutFixed
        />
      </Card>

      <Modal
        title={editingItem ? '编辑属性' : '添加属性'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock
        style={{ width: 560 }}
      >
        <Form
          form={form}
          className={styles.modalForm}
          autoComplete="off"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          onValuesChange={(changed) => {
            if ('type' in changed) {
              const nextType = changed.type as ProductCatalogAttributeType;
              setFormType(nextType);

              if (nextType === 'text') {
                setFormNumberMode('integer');
                form.setFieldsValue({
                  numberMode: undefined,
                  numberPrecision: undefined,
                });
              } else if (nextType === 'number') {
                setFormNumberMode('integer');
                form.setFieldsValue({
                  textMaxLength: undefined,
                  numberMode: 'integer',
                  numberPrecision: undefined,
                });
              } else {
                setFormNumberMode('integer');
                form.setFieldsValue({
                  textMaxLength: undefined,
                  numberMode: undefined,
                  numberPrecision: undefined,
                });
              }
            }

            if ('numberMode' in changed) {
              const nextNumberMode =
                changed.numberMode === 'decimalAllowed'
                  ? 'decimalAllowed'
                  : 'integer';
              setFormNumberMode(nextNumberMode);

              if (nextNumberMode === 'integer') {
                form.setFieldsValue({
                  numberPrecision: undefined,
                });
              }
            }
          }}
        >
          <Form.Item
            field="catalogIds"
            label="选择类目"
            rules={[{ required: true, message: '请选择类目' }]}
            extra="支持多级级联与多选，一个属性可绑定多个商品类目"
          >
            <Cascader
              mode="multiple"
              allowClear
              options={catalogCascaderOptions}
              placeholder="请选择类目"
              showSearch={{ retainInputValueWhileSelect: true }}
            />
          </Form.Item>
          <Form.Item
            field="name"
            label="属性名称"
            rules={[{ required: true, message: '请输入属性名称' }]}
          >
            <Input placeholder="请输入属性名称" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item
            field="type"
            label="属性类型"
            initialValue="text"
            rules={[{ required: true, message: '请选择属性类型' }]}
          >
            <Select placeholder="请选择属性类型">
              <Select.Option value="text">文本（用户自由填写）</Select.Option>
              <Select.Option value="number">数字（用户填写数字）</Select.Option>
              <Select.Option value="single">单选（从预设值中选一个）</Select.Option>
              <Select.Option value="multi">多选（从预设值中选多个）</Select.Option>
            </Select>
          </Form.Item>
          {formType === 'text' && (
            <Form.Item
              field="textMaxLength"
              label="最大字符数"
              rules={[getPositiveIntegerRule('最大字符数需为大于 0 的整数')]}
            >
              <InputNumber
                min={1}
                precision={0}
                placeholder="留空表示不限制"
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
          {formType === 'number' && (
            <Form.Item
              field="numberMode"
              label="数字格式"
              initialValue="integer"
              rules={[{ required: true, message: '请选择数字格式' }]}
            >
              <Select placeholder="请选择数字格式">
                <Select.Option value="integer">仅整数</Select.Option>
                <Select.Option value="decimalAllowed">可含小数</Select.Option>
              </Select>
            </Form.Item>
          )}
          {formType === 'number' && formNumberMode === 'decimalAllowed' && (
            <Form.Item
              field="numberPrecision"
              label="最多小数位数"
              rules={[getNonNegativeIntegerRule('最多小数位数需为大于等于 0 的整数')]}
            >
              <InputNumber
                min={0}
                precision={0}
                placeholder="留空表示不限制"
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
          {(formType === 'single' || formType === 'multi') && (
            <Form.Item
              field="values"
              label="属性值"
              rules={[{ required: true, message: '请至少输入一个属性值' }]}
              extra="输入后按回车添加属性值"
            >
              <InputTag placeholder="输入属性值后回车" allowClear />
            </Form.Item>
          )}
          <Form.Item field="required" label="是否必填" initialValue={false}>
            <Switch checkedText="必填" uncheckedText="选填" />
          </Form.Item>
          <Form.Item
            field="sort"
            label="排序"
            initialValue={1}
            rules={[{ required: true, message: '请输入排序值' }]}
          >
            <InputNumber min={1} max={999} placeholder="数值越小越靠前" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item field="enabled" label="状态" initialValue={true}>
            <Switch checkedText="启用" uncheckedText="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AttributePage;
