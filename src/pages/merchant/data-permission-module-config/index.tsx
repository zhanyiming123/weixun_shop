import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Message,
  Menu,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import usePersistentState from '@/utils/usePersistentState';
import {
  appendDataPermissionModule,
  createDataPermissionModule,
  createDefaultDataPermissionSystems,
  DATA_PERMISSION_MODULE_CONFIG_STORAGE_KEY,
  DataPermissionModuleItem,
  DataPermissionModuleStatus,
  DataPermissionSystem,
  filterDataPermissionSystems,
  findDataPermissionSystemById,
  toggleDataPermissionModuleStatus,
  updateDataPermissionModule,
} from './data';
import styles from './index.module.less';

type ModuleFormValues = {
  name: string;
  description: string;
  permissionCode: string;
  enabled: boolean;
};

type ModalMode = 'create' | 'edit';

const { useForm } = Form;

const MenuItem = Menu.Item;

function buildFormValues(item: DataPermissionModuleItem): ModuleFormValues {
  return {
    name: item.name,
    description: item.description,
    permissionCode: item.permissionCode,
    enabled: item.status === 'enabled',
  };
}

function MerchantDataPermissionModuleConfigPage() {
  const [systems, setSystems] = usePersistentState<DataPermissionSystem[]>(
    DATA_PERMISSION_MODULE_CONFIG_STORAGE_KEY,
    createDefaultDataPermissionSystems()
  );
  const [selectedSystemId, setSelectedSystemId] = useState(systems[0]?.id || '');
  const [systemKeyword, setSystemKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingModuleId, setEditingModuleId] = useState('');
  const [form] = useForm<ModuleFormValues>();

  const filteredSystems = useMemo(
    () => filterDataPermissionSystems(systems, systemKeyword),
    [systemKeyword, systems]
  );

  const currentSystem = useMemo(
    () =>
      findDataPermissionSystemById(systems, selectedSystemId) ||
      filteredSystems[0] ||
      systems[0] ||
      null,
    [filteredSystems, selectedSystemId, systems]
  );

  const editingModule = useMemo(
    () =>
      currentSystem?.modules.find((item) => item.id === editingModuleId) || null,
    [currentSystem, editingModuleId]
  );

  useEffect(() => {
    if (!selectedSystemId && systems[0]) {
      setSelectedSystemId(systems[0].id);
      return;
    }

    if (
      selectedSystemId &&
      !findDataPermissionSystemById(systems, selectedSystemId) &&
      systems[0]
    ) {
      setSelectedSystemId(systems[0].id);
    }
  }, [selectedSystemId, systems]);

  useEffect(() => {
    if (!filteredSystems.length) {
      return;
    }

    if (!filteredSystems.some((item) => item.id === selectedSystemId)) {
      setSelectedSystemId(filteredSystems[0].id);
    }
  }, [filteredSystems, selectedSystemId]);

  useEffect(() => {
    if (!modalVisible) {
      form.resetFields();
      return;
    }

    if (modalMode === 'edit' && editingModule) {
      form.setFieldsValue(buildFormValues(editingModule));
      return;
    }

    form.setFieldsValue({
      name: '',
      description: '',
      permissionCode: '',
      enabled: true,
    });
  }, [editingModule, form, modalMode, modalVisible]);

  function openCreateModal() {
    setModalMode('create');
    setEditingModuleId('');
    setModalVisible(true);
  }

  function openEditModal(item: DataPermissionModuleItem) {
    setModalMode('edit');
    setEditingModuleId(item.id);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingModuleId('');
  }

  async function handleSubmit() {
    if (!currentSystem) {
      return;
    }

    const values = await form.validate();
    const nextValues = {
      name: values.name,
      description: values.description,
      permissionCode: values.permissionCode,
      status: (values.enabled ? 'enabled' : 'disabled') as DataPermissionModuleStatus,
    };

    if (modalMode === 'create') {
      const nextItem = createDataPermissionModule(nextValues);

      setSystems((prev) =>
        appendDataPermissionModule(prev, currentSystem.id, nextItem)
      );
      Message.success('数据权限模块已新增');
    } else if (editingModuleId) {
      setSystems((prev) =>
        updateDataPermissionModule(
          prev,
          currentSystem.id,
          editingModuleId,
          nextValues
        )
      );
      Message.success('数据权限模块已更新');
    }

    closeModal();
  }

  function handleToggleStatus(item: DataPermissionModuleItem) {
    if (!currentSystem) {
      return;
    }

    setSystems((prev) =>
      toggleDataPermissionModuleStatus(prev, currentSystem.id, item.id)
    );
    Message.success(item.status === 'enabled' ? '已禁用该模块' : '已启用该模块');
  }

  const columns = [
    {
      title: '功能模块名称',
      dataIndex: 'name',
      width: 180,
    },
    {
      title: '功能模块说明',
      dataIndex: 'description',
      render: (value: string) => value || '-',
    },
    {
      title: '权限码',
      dataIndex: 'permissionCode',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: DataPermissionModuleStatus) => (
        <Tag color={value === 'enabled' ? 'green' : 'gray'}>
          {value === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, item: DataPermissionModuleItem) => (
        <Space size={12}>
          <Button size="small" type="text" onClick={() => openEditModal(item)}>
            编辑
          </Button>
          <Button size="small" type="text" onClick={() => handleToggleStatus(item)}>
            {item.status === 'enabled' ? '禁用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className={styles.page}>
        <Card className={styles.sidebarCard} title="应用系统">
          <Space className={styles.sidebarContent} direction="vertical" size={16}>
            <Input.Search
              allowClear
              placeholder="请输入系统名称"
              value={systemKeyword}
              onChange={setSystemKeyword}
            />

            {filteredSystems.length ? (
              <Menu
                className={styles.systemMenu}
                selectedKeys={currentSystem ? [currentSystem.id] : []}
                onClickMenuItem={setSelectedSystemId}
              >
                {filteredSystems.map((item) => (
                  <MenuItem key={item.id}>{item.name}</MenuItem>
                ))}
              </Menu>
            ) : (
              <Empty description="暂无匹配系统" />
            )}
          </Space>
        </Card>

        <Card
          className={styles.contentCard}
          title="数据权限模块"
          extra={
            <Button icon={<IconPlus />} type="primary" onClick={openCreateModal}>
              新增
            </Button>
          }
        >
          <Table
            border
            className={styles.moduleTable}
            columns={columns}
            data={currentSystem?.modules || []}
            rowKey="id"
            pagination={false}
            scroll={{ x: 920 }}
            noDataElement={<Empty description="当前系统暂无数据权限模块，请点击新增。" />}
          />
        </Card>
      </div>

      <Modal
        title={modalMode === 'create' ? '新增数据权限模块' : '编辑数据权限模块'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        style={{ width: 560 }}
        unmountOnExit
      >
        <Form
          className={styles.modalForm}
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            field="name"
            label="功能模块名称"
            rules={[{ required: true, message: '请输入功能模块名称' }]}
          >
            <Input placeholder="请输入功能模块名称" />
          </Form.Item>
          <Form.Item field="description" label="功能模块说明">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="请输入功能模块说明"
            />
          </Form.Item>
          <Form.Item
            field="permissionCode"
            label="权限码"
            rules={[{ required: true, message: '请输入权限码' }]}
          >
            <Input placeholder="请输入权限码" />
          </Form.Item>
          <Form.Item
            field="enabled"
            label="状态"
          >
            <Switch checkedText="启用" uncheckedText="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default MerchantDataPermissionModuleConfigPage;
