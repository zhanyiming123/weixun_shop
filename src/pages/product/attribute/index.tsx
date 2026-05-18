import React, { useMemo, useState } from 'react';
import {
  Button,
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
  getEnabledProductCatalogAttributes,
  PRODUCT_CATALOG_ATTRIBUTE_TYPE_COLORS,
  PRODUCT_CATALOG_ATTRIBUTE_TYPE_LABELS,
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

function getNextSortValue(attributes: ProductCatalogAttributeItem[]) {
  return (
    attributes.reduce((maxSort, item) => Math.max(maxSort, item.sort), 0) + 1
  );
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
  const [attributes, setAttributes] = useProductCatalogAttributes();
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

  const orderedAttributes = useMemo(
    () => [
      ...getEnabledProductCatalogAttributes(attributes),
      ...attributes
        .filter((item) => !item.enabled)
        .sort((left, right) => left.sort - right.sort),
    ],
    [attributes]
  );

  const filteredData = useMemo(
    () =>
      orderedAttributes.filter((item) => {
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
      }),
    [filterEnabled, orderedAttributes, searchName]
  );

  function openAddModal() {
    setEditingItem(null);
    setFormType('text');
    setFormNumberMode('integer');
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      description: '',
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
      name: record.name,
      description: record.description,
      type: record.type,
      values: record.values,
      textMaxLength: record.textMaxLength,
      numberMode: record.numberMode || 'integer',
      numberPrecision: record.numberPrecision,
      enabled: record.enabled,
    });
    setModalVisible(true);
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
                  name: values.name,
                  description: values.description?.trim() || undefined,
                  type,
                  values: attributeValues,
                  textMaxLength,
                  numberMode: normalizedNumberMode,
                  numberPrecision,
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
            name: values.name,
            description: values.description?.trim() || undefined,
            type,
            values: attributeValues,
            textMaxLength,
            numberMode: normalizedNumberMode,
            numberPrecision,
            sort: getNextSortValue(prev),
            enabled: values.enabled ?? true,
            createdAt: now(),
          },
        ]);
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
      width: 200,
      render: (value: string) => <Typography.Text bold>{value}</Typography.Text>,
    },
    {
      title: '字段说明',
      dataIndex: 'description',
      width: 260,
      render: (value: string | undefined) =>
        value ? (
          <Typography.Text type="secondary">{value}</Typography.Text>
        ) : (
          '-'
        ),
    },
    {
      title: '属性类型',
      dataIndex: 'type',
      width: 120,
      render: (value: ProductCatalogAttributeType) => (
        <Tag color={PRODUCT_CATALOG_ATTRIBUTE_TYPE_COLORS[value]}>
          {PRODUCT_CATALOG_ATTRIBUTE_TYPE_LABELS[value]}
        </Tag>
      ),
    },
    {
      title: '字段配置',
      dataIndex: 'values',
      width: 360,
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
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'red'}>{value ? '启用' : '禁用'}</Tag>
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
      width: 190,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductCatalogAttributeItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text className={styles.actionLink} onClick={() => openEditModal(record)}>
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          {record.enabled ? (
            <Popconfirm
              title={`确定禁用属性「${record.name}」吗？`}
              onOk={() => handleToggleEnabled(record, false)}
            >
              <Typography.Text className={styles.actionLink}>禁用</Typography.Text>
            </Popconfirm>
          ) : (
            <Typography.Text
              className={styles.actionLink}
              onClick={() => handleToggleEnabled(record, true)}
            >
              启用
            </Typography.Text>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>属性名称</span>
            <Input
              allowClear
              placeholder="请输入属性名称"
              style={{ width: 220 }}
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
          <div className={styles.toolbarLeft} />
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
          scroll={{ x: 1430 }}
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
            field="name"
            label="属性名称"
            rules={[{ required: true, message: '请输入属性名称' }]}
          >
            <Input placeholder="请输入属性名称" maxLength={20} showWordLimit />
          </Form.Item>
          <Form.Item field="description" label="字段说明">
            <Input.TextArea
              placeholder="请输入字段说明"
              maxLength={100}
              showWordLimit
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
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
          <Form.Item field="enabled" label="状态" initialValue={true}>
            <Switch checkedText="启用" uncheckedText="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AttributePage;
