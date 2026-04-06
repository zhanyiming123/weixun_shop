import React, { useState } from 'react';
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

const { useForm } = Form;

type AttributeType = 'text' | 'single' | 'multi';

interface AttributeItem {
  id: string;
  categoryId: string;
  name: string;
  type: AttributeType;
  values: string[];
  required: boolean;
  sort: number;
  enabled: boolean;
  createdAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'C001', name: '服装' },
  { id: 'C002', name: '男装' },
  { id: 'C003', name: '女装' },
  { id: 'C005', name: '数码' },
  { id: 'C006', name: '手机' },
  { id: 'C007', name: '电脑' },
  { id: 'C008', name: '家居' },
];

const MOCK_ATTRIBUTES: AttributeItem[] = [
  { id: 'A001', categoryId: 'C002', name: '尺码', type: 'single', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true, sort: 1, enabled: true, createdAt: '2024-02-01 10:00:00' },
  { id: 'A002', categoryId: 'C002', name: '颜色', type: 'single', values: ['黑色', '白色', '灰色', '藏青', '卡其'], required: true, sort: 2, enabled: true, createdAt: '2024-02-01 10:05:00' },
  { id: 'A003', categoryId: 'C002', name: '材质', type: 'multi', values: ['棉', '麻', '涤纶', '羊毛', '真丝'], required: false, sort: 3, enabled: true, createdAt: '2024-02-01 10:10:00' },
  { id: 'A004', categoryId: 'C002', name: '品牌', type: 'text', values: [], required: false, sort: 4, enabled: true, createdAt: '2024-02-01 10:15:00' },
  { id: 'A005', categoryId: 'C003', name: '尺码', type: 'single', values: ['XS', 'S', 'M', 'L', 'XL'], required: true, sort: 1, enabled: true, createdAt: '2024-02-02 09:00:00' },
  { id: 'A006', categoryId: 'C003', name: '颜色', type: 'single', values: ['红色', '粉色', '蓝色', '绿色', '黄色', '紫色', '白色', '黑色'], required: true, sort: 2, enabled: true, createdAt: '2024-02-02 09:05:00' },
  { id: 'A007', categoryId: 'C006', name: '品牌', type: 'single', values: ['苹果', '华为', '小米', '三星', 'OPPO', 'vivo'], required: true, sort: 1, enabled: true, createdAt: '2024-02-03 08:00:00' },
  { id: 'A008', categoryId: 'C006', name: '存储容量', type: 'multi', values: ['64G', '128G', '256G', '512G', '1T'], required: false, sort: 2, enabled: true, createdAt: '2024-02-03 08:10:00' },
  { id: 'A009', categoryId: 'C006', name: '颜色', type: 'single', values: ['黑色', '白色', '金色', '蓝色'], required: false, sort: 3, enabled: true, createdAt: '2024-02-03 08:15:00' },
  { id: 'A010', categoryId: 'C006', name: '网络制式', type: 'text', values: [], required: false, sort: 4, enabled: false, createdAt: '2024-02-03 08:20:00' },
];

let nextId = 11;

function generateId() {
  return `A${String(nextId++).padStart(3, '0')}`;
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const TYPE_COLORS: Record<AttributeType, string> = {
  text: 'gray',
  single: 'arcoblue',
  multi: 'green',
};

const TYPE_LABELS: Record<AttributeType, string> = {
  text: '文本',
  single: '单选',
  multi: '多选',
};

function AttributePage() {
  const [attributes, setAttributes] = useState<AttributeItem[]>(MOCK_ATTRIBUTES);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('C002');
  const [searchName, setSearchName] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<AttributeItem | null>(null);
  const [form] = useForm();
  const [formType, setFormType] = useState<AttributeType>('text');

  const filteredData = attributes.filter((item) => {
    if (item.categoryId !== selectedCategoryId) return false;
    if (searchName && !item.name.includes(searchName)) return false;
    if (filterEnabled === 'true' && !item.enabled) return false;
    if (filterEnabled === 'false' && item.enabled) return false;
    return true;
  });

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.id === selectedCategoryId);

  function openAddModal() {
    setEditingItem(null);
    setFormType('text');
    form.resetFields();
    form.setFieldsValue({
      categoryId: selectedCategoryId,
    });
    setModalVisible(true);
  }

  function openEditModal(record: AttributeItem) {
    setEditingItem(record);
    setFormType(record.type);
    form.setFieldsValue({
      categoryId: record.categoryId,
      name: record.name,
      type: record.type,
      values: record.values,
      required: record.required,
      sort: record.sort,
      enabled: record.enabled,
    });
    setModalVisible(true);
  }

  function handleDelete(record: AttributeItem) {
    setAttributes((prev) => prev.filter((a) => a.id !== record.id));
    Message.success('删除成功');
  }

  function handleToggleEnabled(record: AttributeItem, checked: boolean) {
    setAttributes((prev) =>
      prev.map((a) => (a.id === record.id ? { ...a, enabled: checked } : a))
    );
    Message.success(`${record.name}已${checked ? '启用' : '禁用'}`);
  }

  async function handleModalOk() {
    try {
      const values = await form.validate();
      const targetCategoryId = editingItem ? editingItem.categoryId : values.categoryId;
      const type = values.type as AttributeType;
      const attrValues = type !== 'text' ? (values.values || []) : [];

      if (editingItem) {
        setAttributes((prev) =>
          prev.map((a) =>
            a.id === editingItem.id
              ? {
                  ...a,
                  name: values.name,
                  type,
                  values: attrValues,
                  required: values.required ?? false,
                  sort: values.sort,
                  enabled: values.enabled ?? true,
                }
              : a
          )
        );
        Message.success('修改成功');
      } else {
        const newItem: AttributeItem = {
          id: generateId(),
          categoryId: targetCategoryId,
          name: values.name,
          type,
          values: attrValues,
          required: values.required ?? false,
          sort: values.sort,
          enabled: values.enabled ?? true,
          createdAt: now(),
        };
        setAttributes((prev) => [...prev, newItem]);
        setSelectedCategoryId(targetCategoryId);
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
      width: 160,
      render: (value: string) => (
        <Typography.Text bold>{value}</Typography.Text>
      ),
    },
    {
      title: '属性类型',
      dataIndex: 'type',
      width: 110,
      render: (value: AttributeType) => (
        <Tag color={TYPE_COLORS[value]}>{TYPE_LABELS[value]}</Tag>
      ),
    },
    {
      title: '属性值',
      dataIndex: 'values',
      width: 300,
      render: (values: string[], record: AttributeItem) => {
        if (record.type === 'text') {
          return <span className={styles.textType}>自由填写</span>;
        }
        if (!values.length) return '-';
        return (
          <div className={styles.valueList}>
            {values.map((v) => (
              <Tag key={v} size="small">{v}</Tag>
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
      sorter: (a: AttributeItem, b: AttributeItem) => a.sort - b.sort,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (value: boolean, record: AttributeItem) => (
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
      width: 200,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: AttributeItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text
            className={styles.actionLink}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          <Popconfirm
            title={`确定删除属性「${record.name}」吗？`}
            onOk={() => handleDelete(record)}
          >
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
            <span className={styles.filterLabel}>所属类目</span>
            <Select
              placeholder="请选择类目"
              style={{ width: 200 }}
              value={selectedCategoryId}
              onChange={(v) => setSelectedCategoryId(v)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
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
              onChange={(v) => setFilterEnabled(v || '')}
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
              当前类目：<Typography.Text bold>{selectedCategory?.name || '-'}</Typography.Text>
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
          noDataElement="暂无属性数据，请先选择类目"
          pagination={{ pageSize: 10, showTotal: true }}
          scroll={{ x: 1260 }}
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
          layout="vertical"
          autoComplete="off"
          onValuesChange={(changed) => {
            if ('type' in changed) {
              setFormType(changed.type);
            }
          }}
        >
          <Form.Item
            field="categoryId"
            label={editingItem ? '所属类目' : '选择类目'}
            rules={[{ required: true, message: '请选择类目' }]}
            extra={editingItem ? undefined : '请先选择属性所属类目，再填写属性内容'}
          >
            <Select placeholder="请选择类目" disabled={!!editingItem}>
              {CATEGORY_OPTIONS.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
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
              <Select.Option value="single">单选（从预设值中选一个）</Select.Option>
              <Select.Option value="multi">多选（从预设值中选多个）</Select.Option>
            </Select>
          </Form.Item>
          {formType !== 'text' && (
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
