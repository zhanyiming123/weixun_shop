import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
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
  expandProductCatalogPathsToLeafIds,
  getProductCatalogFullLabel,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  useProductCatalogItems,
} from '../catalog/data';
import {
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
  const [selectedCatalogPaths, setSelectedCatalogPaths] = useState<string[][]>([]);
  const [searchName, setSearchName] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductCatalogSpecItem | null>(null);
  const [form] = useForm();
  const selectedCatalogIds = useMemo(
    () => expandProductCatalogPathsToLeafIds(selectedCatalogPaths, catalogItems),
    [catalogItems, selectedCatalogPaths]
  );

  const selectedCatalogSummary = useMemo(() => {
    if (!selectedCatalogIds.length) {
      return '全部类目';
    }

    if (selectedCatalogIds.length === 1) {
      return (
        catalogLeafItems.find((item) => item.id === selectedCatalogIds[0])?.label ||
        '全部类目'
      );
    }

    return `已选 ${selectedCatalogIds.length} 个类目`;
  }, [catalogLeafItems, selectedCatalogIds]);

  const filteredData = useMemo(
    () =>
      specs
        .filter((item) => {
          if (
            selectedCatalogIds.length &&
            !item.catalogIds.some((catalogId) => selectedCatalogIds.includes(catalogId))
          ) {
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
        }),
    [filterEnabled, searchName, selectedCatalogIds, specs]
  );

  function openAddModal() {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      catalogIds: selectedCatalogIds.length
        ? selectedCatalogIds.map((catalogId) =>
            getProductCatalogPathById(catalogId, catalogItems)
          )
        : undefined,
      enabled: true,
      values: [],
    });
    setModalVisible(true);
  }

  function openEditModal(record: ProductCatalogSpecItem) {
    setEditingItem(record);
    form.setFieldsValue({
      catalogIds: record.catalogIds.map((id) => getProductCatalogPathById(id, catalogItems)),
      name: record.name,
      values: record.values,
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
      const catalogIds = normalizePaths(values.catalogIds)
        .map((path) => getProductCatalogIdFromPath(path, catalogItems))
        .filter(Boolean) as string[];

      if (!catalogIds.length) {
        Message.warning('请选择叶子类目');
        return;
      }

      const name = resolveProductCatalogSpecIdentity(values.name, editingItem);
      const specValues = normalizeProductCatalogSpecValues(values.values || []);

      if (!specValues.length) {
        Message.warning('请至少输入一个规格值');
        return;
      }

      if (
        isProductCatalogSpecNameDuplicated(
          specs,
          catalogIds,
          name,
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
                  catalogIds,
                  name,
                  values: specValues,
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
            catalogIds,
            name,
            values: specValues,
            enabled: values.enabled ?? true,
            createdAt: now(),
          },
        ]);
        setSelectedCatalogPaths(
          catalogIds[0] ? [getProductCatalogPathById(catalogIds[0], catalogItems)] : []
        );
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
      render: (_: unknown, record: ProductCatalogSpecItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text className={styles.actionLink} onClick={() => openEditModal(record)}>
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          {record.enabled ? (
            <Popconfirm
              title={`确定禁用规格项「${record.name}」吗？`}
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
            <span className={styles.filterLabel}>商品类目</span>
            <Cascader
              allowClear
              changeOnSelect
              className={styles.catalogCascader}
              mode="multiple"
              options={catalogCascaderOptions}
              placeholder="请选择商品类目"
              value={selectedCatalogPaths.length ? selectedCatalogPaths : undefined}
              onChange={(value) => setSelectedCatalogPaths(normalizePaths(value))}
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
                setSelectedCatalogPaths([]);
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
              <Typography.Text bold>{selectedCatalogSummary}</Typography.Text>
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
            field="catalogIds"
            label="商品类目"
            rules={[{ required: true, message: '请选择类目' }]}
            extra="支持多选，一个规格项可绑定多个叶子类目。"
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
            label="规格项名称"
            rules={[{ required: true, message: '请输入规格项名称' }]}
            extra={editingItem ? '编辑时不可修改规格项名称。' : undefined}
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
          <Form.Item field="enabled" label="状态" initialValue={true}>
            <Switch checkedText="启用" uncheckedText="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ProductSpecPage;
