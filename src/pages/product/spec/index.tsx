import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
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
  getEnabledSpecsByCatalogId,
  isProductCatalogSpecNameDuplicated,
  normalizeProductCatalogSpecValues,
  resolveProductCatalogSpecIdentity,
  type ProductCatalogSpecItem,
  useProductCatalogSpecs,
} from './data';

const { useForm } = Form;

function generateId() {
  return `spec_${Date.now()}`;
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

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

function ProductSpecPage() {
  const [catalogItems] = useProductCatalogItems();
  const [specs, setSpecs] = useProductCatalogSpecs();
  const catalogLeafItems = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const catalogCascaderOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductCatalogSpecItem | null>(null);
  const [form] = useForm();

  const selectedCatalog = catalogLeafItems.find((item) => item.id === selectedCatalogId);
  const selectedCatalogEnabledSpecs = useMemo(
    () => getEnabledSpecsByCatalogId(specs, selectedCatalogId),
    [selectedCatalogId, specs]
  );

  const filteredData = useMemo(
    () =>
      specs
        .filter((item) => {
          if (selectedCatalogId && item.catalogId !== selectedCatalogId) {
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
        .sort((left, right) => left.sort - right.sort),
    [filterEnabled, searchName, selectedCatalogId, specs]
  );

  function openAddModal() {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      catalogId: selectedCatalogId
        ? getProductCatalogPathById(selectedCatalogId, catalogItems)
        : undefined,
      sort: selectedCatalogEnabledSpecs.length + 1,
      enabled: true,
      values: [],
    });
    setModalVisible(true);
  }

  function openEditModal(record: ProductCatalogSpecItem) {
    setEditingItem(record);
    form.setFieldsValue({
      catalogId: getProductCatalogPathById(record.catalogId, catalogItems),
      name: record.name,
      values: record.values,
      sort: record.sort,
      enabled: record.enabled,
    });
    setModalVisible(true);
  }

  function handleDelete(record: ProductCatalogSpecItem) {
    setSpecs((previous) => previous.filter((item) => item.id !== record.id));
    Message.success('删除成功');
  }

  function handleToggleEnabled(record: ProductCatalogSpecItem, checked: boolean) {
    setSpecs((previous) =>
      previous.map((item) =>
        item.id === record.id ? { ...item, enabled: checked } : item
      )
    );
    Message.success(`${record.name}已${checked ? '启用' : '禁用'}`);
  }

  async function handleModalOk() {
    try {
      const values = await form.validate();
      const catalogId = getProductCatalogIdFromPath(
        normalizePath(values.catalogId),
        catalogItems
      );

      if (!catalogId) {
        Message.warning('请选择叶子类目');
        return;
      }

      const identity = resolveProductCatalogSpecIdentity(
        {
          catalogId,
          name: values.name,
        },
        editingItem
      );
      const specValues = normalizeProductCatalogSpecValues(values.values || []);

      if (!specValues.length) {
        Message.warning('请至少输入一个规格值');
        return;
      }

      if (
        isProductCatalogSpecNameDuplicated(
          specs,
          identity.catalogId,
          identity.name,
          editingItem?.id
        )
      ) {
        Message.warning('同一类目下规格项名称不能重复');
        return;
      }

      if (editingItem) {
        setSpecs((previous) =>
          previous.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  catalogId: identity.catalogId,
                  name: identity.name,
                  values: specValues,
                  sort: values.sort,
                  enabled: values.enabled ?? true,
                }
              : item
          )
        );
        Message.success('修改成功');
      } else {
        setSpecs((previous) => [
          ...previous,
          {
            id: generateId(),
            catalogId: identity.catalogId,
            name: identity.name,
            values: specValues,
            sort: values.sort,
            enabled: values.enabled ?? true,
            createdAt: now(),
          },
        ]);
        setSelectedCatalogId(identity.catalogId);
        Message.success('添加成功');
      }

      setModalVisible(false);
    } catch (_) {
      // validation failed
    }
  }

  const columns = [
    {
      title: '规格项',
      dataIndex: 'name',
      width: 180,
      render: (value: string) => <Typography.Text bold>{value}</Typography.Text>,
    },
    {
      title: '商品类目',
      dataIndex: 'catalogId',
      width: 260,
      render: (value: string) => getProductCatalogFullLabel(value, catalogItems),
    },
    {
      title: '规格值',
      dataIndex: 'values',
      width: 360,
      render: (values: string[]) => (
        <div className={styles.valueList}>
          {values.map((value) => (
            <Tag key={value} size="small">
              {value}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      width: 90,
      sorter: (a: ProductCatalogSpecItem, b: ProductCatalogSpecItem) => a.sort - b.sort,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (value: boolean, record: ProductCatalogSpecItem) => (
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
      render: (_: unknown, record: ProductCatalogSpecItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text className={styles.actionLink} onClick={() => openEditModal(record)}>
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          <Popconfirm title={`确定删除规格项「${record.name}」吗？`} onOk={() => handleDelete(record)}>
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
            <span className={styles.filterLabel}>规格项</span>
            <Input
              allowClear
              placeholder="请输入规格项名称"
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
            添加规格项
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          data={filteredData}
          noDataElement="暂无规格数据"
          pagination={{ pageSize: 10, showTotal: true }}
          scroll={{ x: 1460 }}
          tableLayoutFixed
        />
      </Card>

      <Modal
        title={editingItem ? '编辑规格项' : '添加规格项'}
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
        >
          <Form.Item
            field="catalogId"
            label="商品类目"
            rules={[{ required: true, message: '请选择类目' }]}
            extra="一个规格项只绑定一个叶子类目。"
          >
            <Cascader
              allowClear={!editingItem}
              disabled={Boolean(editingItem)}
              options={catalogCascaderOptions}
              placeholder="请选择类目"
            />
          </Form.Item>
          <Form.Item
            field="name"
            label="规格项名称"
            rules={[{ required: true, message: '请输入规格项名称' }]}
          >
            <Input
              disabled={Boolean(editingItem)}
              placeholder="例如：班型、颜色、尺码"
              maxLength={20}
              showWordLimit
            />
          </Form.Item>
          <Form.Item
            field="values"
            label="规格值"
            rules={[{ required: true, message: '请至少输入一个规格值' }]}
            extra="输入后按回车添加规格值。"
          >
            <InputTag placeholder="输入规格值后回车" allowClear />
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

export default ProductSpecPage;
