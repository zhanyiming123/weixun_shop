import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  Link,
  Message,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconUserAdd,
} from '@arco-design/web-react/icon';
import { useSelector } from 'react-redux';
import {
  readEnterpriseDepartmentItems,
} from '@/pages/enterprise/department/data';
import { useEnterpriseRoleItems } from '@/pages/enterprise/role/data';
import {
  buildStoreOrgReferenceTree,
  buildStoreReferencedEmployees,
  getReferencedHrEmployeesBySelection,
  getStoreOrgReferenceConfigByStoreId,
  HrEmployeeItem,
  readHrEmployeeItems,
  readStoreOrgReferenceConfigs,
  StoreOrgReferenceTreeNode,
  upsertStoreOrgReferenceConfig,
} from '@/pages/store-config/org-reference/data';
import {
  buildStoreEmployeeSourceEmployees,
  buildStoreManagedEmployees,
  createStoreExternalEmployee,
  getDefaultStoreEmployeeRoleIds,
  removeStoreEmployeeBinding,
  readStoreEmployeePermissionConfigItems,
  readStoreExternalEmployeeItems,
  StoreManagedEmployeeItem,
  upsertStoreEmployeePermissionConfig,
} from './data';
import {
  isStoreEmployeeCreateActionVisible,
  isStoreEmployeeRowActionVisible,
} from './visibility';
import { GlobalState } from '@/store';
import styles from './index.module.less';

const Option = Select.Option;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const STORE_EMPLOYEE_DEPARTMENT_LABEL = '唯寻广州';

type OrganizationAddMode = 'department' | 'person';
type AddSource = 'organization' | 'external';
type ExternalAddMode = 'single' | 'batch';
type AddRoleMap = Record<string, string[]>;

type ExternalSingleFormState = {
  name: string;
  account: string;
  contactPhone: string;
  roleIds: string[];
  status: 'enabled' | 'disabled';
};

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}

function collectTreeKeys(nodes: Array<{ key: string; children?: any[] }>): string[] {
  return nodes.flatMap((node) => [
    node.key,
    ...(Array.isArray(node.children) ? collectTreeKeys(node.children) : []),
  ]);
}

function toTreeSelectData(nodes: StoreOrgReferenceTreeNode[]) {
  return nodes.map((node) => ({
    key: node.departmentId || node.key,
    value: node.departmentId || node.key,
    title: node.title,
    disabled: node.nodeType === 'root' || !node.departmentId,
    children: node.children?.length ? toTreeSelectData(node.children) : undefined,
  }));
}

function buildOrgDepartmentLabelMap(
  nodes: StoreOrgReferenceTreeNode[],
  result = new Map<string, string>()
) {
  nodes.forEach((node) => {
    if (node.departmentId) {
      result.set(node.departmentId, node.pathLabels?.join(' / ') || node.title);
    }

    if (node.children?.length) {
      buildOrgDepartmentLabelMap(node.children, result);
    }
  });

  return result;
}

export function applyEmployeeFilters(
  employees: StoreManagedEmployeeItem[],
  filters: {
    keyword: string;
    roleId: string;
  }
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return employees.filter((employee) => {
    if (
      keyword &&
      ![
        employee.name,
        employee.account,
        employee.contactPhone,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }

    if (filters.roleId !== 'all' && !employee.roleIds.includes(filters.roleId)) {
      return false;
    }

    return true;
  });
}

function getEmployeeSearchText(employee: HrEmployeeItem) {
  return [
    employee.name,
    employee.account,
    employee.contactPhone,
    employee.departmentPathLabels.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

function createDefaultExternalSingleForm(defaultRoleIds: string[]): ExternalSingleFormState {
  return {
    name: '',
    account: '',
    contactPhone: '',
    roleIds: defaultRoleIds,
    status: 'enabled',
  };
}

function StoreEmployeePage() {
  const { currentDemoSystem, currentOrganization } = useSelector(
    (state: GlobalState) => state
  );
  const [roleItems] = useEnterpriseRoleItems();
  const departmentItems = useMemo(() => readEnterpriseDepartmentItems(), []);
  const orgTreeData = useMemo(() => buildStoreOrgReferenceTree(), []);
  const orgTreeSelectData = useMemo(() => toTreeSelectData(orgTreeData), [orgTreeData]);
  const orgTreeDefaultExpandedKeys = useMemo(
    () => collectTreeKeys(orgTreeSelectData),
    [orgTreeSelectData]
  );
  const orgDepartmentLabelMap = useMemo(
    () => buildOrgDepartmentLabelMap(orgTreeData),
    [orgTreeData]
  );
  const hrEmployees = useMemo(
    () => readHrEmployeeItems(departmentItems),
    [departmentItems]
  );

  const currentStoreId =
    currentOrganization?.scope === 'store' ? currentOrganization.id : undefined;
  const isCreateActionVisible = isStoreEmployeeCreateActionVisible(currentDemoSystem);

  const [orgConfigItems, setOrgConfigItems] = useState(() =>
    readStoreOrgReferenceConfigs()
  );
  const [permissionConfigItems, setPermissionConfigItems] = useState(() =>
    readStoreEmployeePermissionConfigItems()
  );
  const [externalEmployeeItems, setExternalEmployeeItems] = useState(() =>
    readStoreExternalEmployeeItems(undefined, {
      includeRemoved: true,
    })
  );
  const [draftFilters, setDraftFilters] = useState({
    keyword: '',
    roleId: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [editingEmployee, setEditingEmployee] =
    useState<StoreManagedEmployeeItem | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);

  const [addVisible, setAddVisible] = useState(false);
  const [addSource, setAddSource] = useState<AddSource>('organization');
  const [organizationAddMode, setOrganizationAddMode] =
    useState<OrganizationAddMode>('department');
  const [addDepartmentIds, setAddDepartmentIds] = useState<string[]>([]);
  const [addSelectedEmployeeIds, setAddSelectedEmployeeIds] = useState<string[]>([]);
  const [addDefaultRoleIds, setAddDefaultRoleIds] = useState<string[]>([]);
  const [addRoleMap, setAddRoleMap] = useState<AddRoleMap>({});
  const [personSelectorVisible, setPersonSelectorVisible] = useState(false);
  const [personKeyword, setPersonKeyword] = useState('');
  const [personPage, setPersonPage] = useState(1);
  const [personPageSize, setPersonPageSize] = useState(10);

  const [externalAddMode, setExternalAddMode] = useState<ExternalAddMode>('single');
  const [externalSingleForm, setExternalSingleForm] = useState<ExternalSingleFormState>(() =>
    createDefaultExternalSingleForm([])
  );
  const [externalBatchFileName, setExternalBatchFileName] = useState('');
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  const savedConfig = useMemo(
    () =>
      currentStoreId
        ? getStoreOrgReferenceConfigByStoreId(currentStoreId, orgConfigItems)
        : undefined,
    [currentStoreId, orgConfigItems]
  );
  const referencedEmployees = useMemo(
    () =>
      currentStoreId
        ? buildStoreReferencedEmployees(
            currentStoreId,
            savedConfig,
            hrEmployees,
            orgTreeData
          )
        : [],
    [currentStoreId, hrEmployees, orgTreeData, savedConfig]
  );
  const currentStoreExternalEmployees = useMemo(
    () =>
      currentStoreId
        ? externalEmployeeItems.filter(
            (item) => item.storeId === currentStoreId && !item.removedAt
          )
        : [],
    [currentStoreId, externalEmployeeItems]
  );
  const sourceEmployees = useMemo(
    () =>
      currentStoreId
        ? buildStoreEmployeeSourceEmployees(
            currentStoreId,
            referencedEmployees,
            currentStoreExternalEmployees
          )
        : [],
    [currentStoreExternalEmployees, currentStoreId, referencedEmployees]
  );
  const managedEmployees = useMemo(
    () =>
      currentStoreId
        ? buildStoreManagedEmployees(
            currentStoreId,
            referencedEmployees,
            permissionConfigItems,
            roleItems,
            departmentItems,
            currentStoreExternalEmployees
          )
        : [],
    [
      currentStoreExternalEmployees,
      currentStoreId,
      departmentItems,
      permissionConfigItems,
      referencedEmployees,
      roleItems,
    ]
  );
  const managedEmployeeIdSet = useMemo(
    () => new Set(managedEmployees.map((employee) => employee.id)),
    [managedEmployees]
  );
  const managedEmployeeMap = useMemo(
    () => new Map(managedEmployees.map((employee) => [employee.id, employee] as const)),
    [managedEmployees]
  );
  const storeRoleItems = useMemo(
    () =>
      roleItems
        .filter((role) => role.scope === 'store')
        .sort((left, right) => {
          if (left.id === 'role_store_staff') {
            return -1;
          }

          if (right.id === 'role_store_staff') {
            return 1;
          }

          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault);
          }

          return left.name.localeCompare(right.name, 'zh-CN');
        }),
    [roleItems]
  );
  const defaultRoleIds = useMemo(
    () => getDefaultStoreEmployeeRoleIds(roleItems),
    [roleItems]
  );
  const addPreviewEmployees = useMemo(() => {
    if (organizationAddMode === 'department') {
      return getReferencedHrEmployeesBySelection(
        addDepartmentIds,
        hrEmployees,
        orgTreeData
      );
    }

    const selectedEmployeeIdSet = new Set(addSelectedEmployeeIds);
    return hrEmployees.filter((employee) => selectedEmployeeIdSet.has(employee.id));
  }, [
    addDepartmentIds,
    addSelectedEmployeeIds,
    hrEmployees,
    orgTreeData,
    organizationAddMode,
  ]);
  const addPreviewEmployeeIds = useMemo(
    () => addPreviewEmployees.map((employee) => employee.id),
    [addPreviewEmployees]
  );
  const addNewPreviewEmployees = useMemo(
    () =>
      addPreviewEmployees.filter((employee) => !managedEmployeeIdSet.has(employee.id)),
    [addPreviewEmployees, managedEmployeeIdSet]
  );
  const filteredEmployees = useMemo(
    () => applyEmployeeFilters(managedEmployees, appliedFilters),
    [appliedFilters, managedEmployees]
  );
  const filteredPersonRows = useMemo(() => {
    const keyword = personKeyword.trim().toLowerCase();

    return keyword
      ? hrEmployees.filter((employee) =>
          getEmployeeSearchText(employee).includes(keyword)
        )
      : hrEmployees;
  }, [hrEmployees, personKeyword]);
  const currentPersonRows = useMemo(() => {
    const start = (personPage - 1) * personPageSize;
    return filteredPersonRows.slice(start, start + personPageSize);
  }, [filteredPersonRows, personPage, personPageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredEmployees.length, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredPersonRows.length / personPageSize));

    if (personPage > totalPages) {
      setPersonPage(totalPages);
    }
  }, [filteredPersonRows.length, personPage, personPageSize]);

  useEffect(() => {
    if (!addVisible || addSource !== 'organization') {
      return;
    }

    setAddRoleMap((previous) => {
      const nextRoleMap: AddRoleMap = {};

      addPreviewEmployeeIds.forEach((employeeId) => {
        nextRoleMap[employeeId] = previous[employeeId]?.length
          ? previous[employeeId]
          : addDefaultRoleIds;
      });

      return nextRoleMap;
    });
  }, [addDefaultRoleIds, addPreviewEmployeeIds, addSource, addVisible]);

  function updateDraftFilter<Key extends keyof typeof draftFilters>(
    key: Key,
    value: typeof draftFilters[Key]
  ) {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updateExternalSingleForm<Key extends keyof ExternalSingleFormState>(
    key: Key,
    value: ExternalSingleFormState[Key]
  ) {
    setExternalSingleForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleQuery() {
    setAppliedFilters({ ...draftFilters });
    setCurrentPage(1);
  }

  function handleReset() {
    const nextFilters = {
      keyword: '',
      roleId: 'all',
    };

    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setCurrentPage(1);
  }

  function openEditModal(record: StoreManagedEmployeeItem) {
    setEditingEmployee(record);
    setEditRoleIds(record.roleIds.length ? record.roleIds : defaultRoleIds);
  }

  function closeEditModal() {
    setEditingEmployee(null);
    setEditRoleIds([]);
  }

  function handleEditConfirm() {
    if (!currentStoreId || !editingEmployee) {
      return;
    }

    if (!editRoleIds.length) {
      Message.warning('请至少选择一个店铺角色');
      return;
    }

    const nextItems = upsertStoreEmployeePermissionConfig(
      {
        storeId: currentStoreId,
        employeeId: editingEmployee.id,
        roleIds: editRoleIds,
        manualIncludedEmployeeIds: editingEmployee.manualIncludedEmployeeIds,
        manualExcludedEmployeeIds: editingEmployee.manualExcludedEmployeeIds,
      },
      permissionConfigItems,
      sourceEmployees,
      roleItems,
      departmentItems
    );

    setPermissionConfigItems(nextItems);
    Message.success('员工信息已更新');
    closeEditModal();
  }

  function handleRemove(record: StoreManagedEmployeeItem) {
    if (!isStoreEmployeeRowActionVisible('移除', currentDemoSystem)) {
      return;
    }

    if (!currentStoreId) {
      return;
    }

    Modal.confirm({
      title: '移除员工',
      content: '是否移除该员工？',
      onOk: () => {
        const nextState = removeStoreEmployeeBinding(
          currentStoreId,
          {
            id: record.id,
            sourceType: record.sourceType,
          },
          orgConfigItems,
          permissionConfigItems,
          externalEmployeeItems,
          hrEmployees,
          roleItems,
          departmentItems,
          orgTreeData
        );

        setOrgConfigItems(nextState.orgConfigItems);
        setPermissionConfigItems(nextState.permissionConfigItems);
        setExternalEmployeeItems(nextState.externalEmployeeItems);
        setCurrentPage(1);
        Message.success('员工已移除');
      },
    });
  }

  function openAddModal() {
    if (!isCreateActionVisible) {
      return;
    }

    setAddSource('organization');
    setOrganizationAddMode('department');
    setAddDepartmentIds([]);
    setAddSelectedEmployeeIds([]);
    setAddDefaultRoleIds(defaultRoleIds);
    setAddRoleMap({});
    setPersonKeyword('');
    setPersonPage(1);
    setExternalAddMode('single');
    setExternalSingleForm(createDefaultExternalSingleForm(defaultRoleIds));
    setExternalBatchFileName('');
    setAddVisible(true);
  }

  function closeAddModal() {
    setAddVisible(false);
    setPersonSelectorVisible(false);
  }

  function applyDefaultRoleToPreview() {
    if (!addPreviewEmployeeIds.length) {
      Message.info('请先选择部门或人员');
      return;
    }

    if (!addDefaultRoleIds.length) {
      Message.warning('请至少选择一个默认角色');
      return;
    }

    setAddRoleMap(
      addPreviewEmployeeIds.reduce<AddRoleMap>((result, employeeId) => {
        result[employeeId] = addDefaultRoleIds;
        return result;
      }, {})
    );
  }

  function handlePreviewRoleChange(employeeId: string, nextRoleIds: unknown) {
    setAddRoleMap((previous) => ({
      ...previous,
      [employeeId]: normalizeStringArray(nextRoleIds),
    }));
  }

  function handleOrganizationAddConfirm() {
    if (!currentStoreId) {
      return;
    }

    if (organizationAddMode === 'department' && !addDepartmentIds.length) {
      Message.warning('请选择要添加的部门');
      return;
    }

    if (organizationAddMode === 'person' && !addSelectedEmployeeIds.length) {
      Message.warning('请选择要添加的人员');
      return;
    }

    const newEmployeeIds = addNewPreviewEmployees.map((employee) => employee.id);
    const missingRoleEmployee = newEmployeeIds.find(
      (employeeId) => !(addRoleMap[employeeId] || []).length
    );

    if (missingRoleEmployee) {
      Message.warning('请为新增人员选择店铺角色');
      return;
    }

    const latestOrgConfigItems = readStoreOrgReferenceConfigs(hrEmployees);
    const latestConfig = getStoreOrgReferenceConfigByStoreId(
      currentStoreId,
      latestOrgConfigItems
    );
    const nextDepartmentIds =
      organizationAddMode === 'department'
        ? uniqueStrings([...(latestConfig?.selectedDepartmentIds || []), ...addDepartmentIds])
        : latestConfig?.selectedDepartmentIds || [];
    const nextEmployeeIds =
      organizationAddMode === 'person'
        ? uniqueStrings([
            ...(latestConfig?.selectedEmployeeIds || []),
            ...addSelectedEmployeeIds.filter(
              (employeeId) => !managedEmployeeIdSet.has(employeeId)
            ),
          ])
        : latestConfig?.selectedEmployeeIds || [];
    const nextOrgConfigItems = upsertStoreOrgReferenceConfig(
      {
        storeId: currentStoreId,
        selectedDepartmentIds: nextDepartmentIds,
        selectedEmployeeIds: nextEmployeeIds,
        excludedEmployeeIds: latestConfig?.excludedEmployeeIds || [],
        subordinateRelations: latestConfig?.subordinateRelations || [],
        updatedAt: latestConfig?.updatedAt || '',
      },
      latestOrgConfigItems,
      hrEmployees,
      orgTreeData
    );
    const nextSavedConfig = getStoreOrgReferenceConfigByStoreId(
      currentStoreId,
      nextOrgConfigItems
    );
    const nextReferencedEmployees = buildStoreReferencedEmployees(
      currentStoreId,
      nextSavedConfig,
      hrEmployees,
      orgTreeData
    );
    const nextSourceEmployees = buildStoreEmployeeSourceEmployees(
      currentStoreId,
      nextReferencedEmployees,
      currentStoreExternalEmployees
    );
    const nextPermissionItems = newEmployeeIds.reduce(
      (items, employeeId) =>
        upsertStoreEmployeePermissionConfig(
          {
            storeId: currentStoreId,
            employeeId,
            roleIds: addRoleMap[employeeId] || addDefaultRoleIds,
            manualIncludedEmployeeIds: [],
            manualExcludedEmployeeIds: [],
          },
          items,
          nextSourceEmployees,
          roleItems,
          departmentItems
        ),
      permissionConfigItems
    );

    setOrgConfigItems(nextOrgConfigItems);
    setPermissionConfigItems(nextPermissionItems);
    setCurrentPage(1);
    closeAddModal();

    if (newEmployeeIds.length) {
      Message.success(`已添加 ${newEmployeeIds.length} 名员工`);
      return;
    }

    Message.info('所选人员已在当前店铺中');
  }

  function handleExternalAddConfirm() {
    if (!currentStoreId) {
      return;
    }

    if (externalAddMode === 'batch') {
      if (!externalBatchFileName) {
        Message.warning('请先选择导入文件');
        return;
      }

      Message.info('批量导入当前为交互原型，暂不执行实际导入。');
      closeAddModal();
      return;
    }

    const employeeName = externalSingleForm.name.trim();
    const employeeAccount = externalSingleForm.account.trim();
    const contactPhone = externalSingleForm.contactPhone.trim();

    if (!employeeName) {
      Message.warning('请输入员工姓名');
      return;
    }

    if (!employeeAccount) {
      Message.warning('请输入员工账号');
      return;
    }

    if (!contactPhone) {
      Message.warning('请输入员工手机号');
      return;
    }

    if (!externalSingleForm.roleIds.length) {
      Message.warning('请至少选择一个店铺角色');
      return;
    }

    const duplicatedAccount = managedEmployees.find(
      (employee) => employee.account === employeeAccount
    );

    if (duplicatedAccount) {
      Message.warning('员工账号已存在，请更换后重试');
      return;
    }

    const { item, items: nextExternalItems } = createStoreExternalEmployee(
      {
        storeId: currentStoreId,
        name: employeeName,
        account: employeeAccount,
        contactPhone,
        status: externalSingleForm.status,
      },
      externalEmployeeItems
    );
    const nextStoreExternalEmployees = nextExternalItems.filter(
      (externalEmployee) =>
        externalEmployee.storeId === currentStoreId && !externalEmployee.removedAt
    );
    const nextSourceEmployees = buildStoreEmployeeSourceEmployees(
      currentStoreId,
      referencedEmployees,
      nextStoreExternalEmployees
    );
    const nextPermissionItems = upsertStoreEmployeePermissionConfig(
      {
        storeId: currentStoreId,
        employeeId: item.id,
        roleIds: externalSingleForm.roleIds,
        manualIncludedEmployeeIds: [],
        manualExcludedEmployeeIds: [],
      },
      permissionConfigItems,
      nextSourceEmployees,
      roleItems,
      departmentItems
    );

    setExternalEmployeeItems(nextExternalItems);
    setPermissionConfigItems(nextPermissionItems);
    setCurrentPage(1);
    closeAddModal();
    Message.success('已创建 1 名员工');
  }

  function handleAddConfirm() {
    if (addSource === 'organization') {
      handleOrganizationAddConfirm();
      return;
    }

    handleExternalAddConfirm();
  }

  function handlePersonSelectorConfirm() {
    setAddSelectedEmployeeIds((previous) =>
      previous.filter((employeeId) => !managedEmployeeIdSet.has(employeeId))
    );
    setPersonSelectorVisible(false);
  }

  function handleExternalTemplateDownload() {
    const lines = [
      ['姓名*', '账号*', '手机号*', '店铺角色*', '状态(选填)'],
      ['张三', 'zhangsan', '13800000000', '店铺员工', 'enabled'],
    ];
    const csvContent = `\uFEFF${lines.map((line) => line.join(',')).join('\n')}`;
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = '员工导入模板.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  function handleBatchFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setExternalBatchFileName(file?.name || '');
  }

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'name',
      width: 140,
      render: (value: string) => (
        <Typography.Text className={styles.primaryText}>{value}</Typography.Text>
      ),
    },
    {
      title: '工号/账号',
      dataIndex: 'account',
      width: 230,
    },
    {
      title: '联系方式',
      dataIndex: 'contactPhone',
      width: 150,
    },
    {
      title: '所属部门',
      dataIndex: 'sourceDepartmentPath',
      width: 240,
      render: () => STORE_EMPLOYEE_DEPARTMENT_LABEL,
    },
    {
      title: '店铺角色',
      dataIndex: 'roleNames',
      width: 180,
      render: (value: string[]) =>
        value.length ? (
          value.join('、')
        ) : (
          <Typography.Text type="secondary">未分配</Typography.Text>
        ),
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: StoreManagedEmployeeItem) => (
        <Space size={12}>
          {isStoreEmployeeRowActionVisible('编辑', currentDemoSystem) && (
            <Link onClick={() => openEditModal(record)}>编辑</Link>
          )}
          {isStoreEmployeeRowActionVisible('移除', currentDemoSystem) && (
            <Link onClick={() => handleRemove(record)}>移除</Link>
          )}
        </Space>
      ),
    },
  ];

  const addPreviewColumns = [
    {
      title: '人员信息',
      dataIndex: 'name',
      width: 180,
      render: (_: string, record: HrEmployeeItem) => (
        <div className={styles.employeeInfoCell}>
          <Typography.Text className={styles.primaryText}>
            {record.name}
          </Typography.Text>
          <Typography.Text type="secondary">{record.account}</Typography.Text>
        </div>
      ),
    },
    {
      title: '来源部门',
      dataIndex: 'departmentPathLabels',
      width: 260,
      render: (value: string[]) => value.join(' / '),
    },
    {
      title: '联系方式',
      dataIndex: 'contactPhone',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: 'enabled' | 'disabled') => (
        <Tag color={value === 'enabled' ? 'green' : 'orange'}>
          {value === 'enabled' ? '在职' : '离职'}
        </Tag>
      ),
    },
    {
      title: '店铺角色',
      dataIndex: 'roleIds',
      width: 260,
      render: (_: unknown, record: HrEmployeeItem) => {
        const existingEmployee = managedEmployeeMap.get(record.id);

        if (existingEmployee) {
          return (
            <Space wrap>
              {existingEmployee.roleNames.map((roleName) => (
                <Tag key={roleName}>{roleName}</Tag>
              ))}
              <Tag color="gray">已在店铺</Tag>
            </Space>
          );
        }

        return (
          <Select
            mode="multiple"
            allowClear
            className={styles.roleSelect}
            placeholder="请选择店铺角色"
            value={addRoleMap[record.id] || addDefaultRoleIds}
            onChange={(value) => handlePreviewRoleChange(record.id, value)}
          >
            {storeRoleItems.map((role) => (
              <Option key={role.id} value={role.id}>
                {role.name}
              </Option>
            ))}
          </Select>
        );
      },
    },
  ];

  const personColumns = [
    {
      title: '人员姓名',
      dataIndex: 'name',
      width: 140,
      render: (value: string, record: HrEmployeeItem) => (
        <div className={styles.employeeInfoCell}>
          <Typography.Text className={styles.primaryText}>{value}</Typography.Text>
          {managedEmployeeIdSet.has(record.id) && <Tag size="small">已在店铺</Tag>}
        </div>
      ),
    },
    {
      title: '工号/账号',
      dataIndex: 'account',
      width: 230,
    },
    {
      title: '来源部门',
      dataIndex: 'departmentPathLabels',
      width: 260,
      render: (value: string[]) => value.join(' / '),
    },
    {
      title: '联系方式',
      dataIndex: 'contactPhone',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: 'enabled' | 'disabled') => (
        <Tag color={value === 'enabled' ? 'green' : 'orange'}>
          {value === 'enabled' ? '在职' : '离职'}
        </Tag>
      ),
    },
  ];

  if (!currentStoreId) {
    return (
      <Card>
        <Empty description="当前未选择具体店铺，暂无法管理店铺人员。" />
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>员工搜索</span>
            <Input
              allowClear
              className={styles.filterInput}
              placeholder="姓名/工号/手机号"
              prefix={<IconSearch />}
              value={draftFilters.keyword}
              onChange={(value) => updateDraftFilter('keyword', value)}
              onPressEnter={handleQuery}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>店铺角色</span>
            <Select
              className={styles.filterSelect}
              value={draftFilters.roleId}
              onChange={(value) => updateDraftFilter('roleId', String(value))}
            >
              <Option value="all">全部角色</Option>
              {storeRoleItems.map((role) => (
                <Option key={role.id} value={role.id}>
                  {role.name}
                </Option>
              ))}
            </Select>
          </div>
          <div className={styles.filterActions}>
            <Button type="primary" onClick={handleQuery}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div>
            <Typography.Text className={styles.sectionTitle}>员工列表</Typography.Text>
          </div>
          {isCreateActionVisible && (
            <Button type="primary" icon={<IconUserAdd />} onClick={openAddModal}>
              新增员工
            </Button>
          )}
        </div>

        <Table
          rowKey="id"
          columns={columns}
          data={filteredEmployees}
          noDataElement="当前店铺暂无员工"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredEmployees.length,
            sizeCanChange: true,
            sizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: true,
            showJumper: true,
            onChange: (pageNumber, nextPageSize) => {
              setCurrentPage(pageNumber);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: 1140 }}
          tableLayoutFixed
        />
      </Card>

      <Modal
        title="编辑员工"
        visible={Boolean(editingEmployee)}
        autoFocus={false}
        focusLock
        style={{ width: 720 }}
        onCancel={closeEditModal}
        onOk={handleEditConfirm}
      >
        {editingEmployee && (
          <div className={styles.modalContent}>
            <div className={styles.formBlock}>
              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>员工姓名</span>
                <div className={styles.formRowControl}>
                  <Typography.Text className={styles.readonlyText}>
                    {editingEmployee.name}
                  </Typography.Text>
                </div>
              </div>
              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>工号/账号</span>
                <div className={styles.formRowControl}>
                  <Typography.Text className={styles.readonlyText}>
                    {editingEmployee.account}
                  </Typography.Text>
                </div>
              </div>
              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>联系方式</span>
                <div className={styles.formRowControl}>
                  <Typography.Text className={styles.readonlyText}>
                    {editingEmployee.contactPhone}
                  </Typography.Text>
                </div>
              </div>
              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>所属部门</span>
                <div className={styles.formRowControl}>
                  <Typography.Text className={styles.readonlyText}>
                    {STORE_EMPLOYEE_DEPARTMENT_LABEL}
                  </Typography.Text>
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>
                <span className={styles.requiredMark}>*</span>
                店铺角色
              </span>
              <div className={styles.formRowControl}>
                <Select
                  mode="multiple"
                  allowClear
                  className={styles.fullWidth}
                  placeholder="请选择店铺角色"
                  value={editRoleIds}
                  onChange={(value) => setEditRoleIds(normalizeStringArray(value))}
                >
                  {storeRoleItems.map((role) => (
                    <Option key={role.id} value={role.id}>
                      {role.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="新增员工"
        visible={addVisible}
        autoFocus={false}
        focusLock
        style={{ width: 1040 }}
        onCancel={closeAddModal}
        onOk={handleAddConfirm}
      >
        <div className={styles.modalContent}>
          <input
            ref={batchFileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className={styles.hiddenFileInput}
            onChange={handleBatchFileChange}
          />

          {addSource === 'organization' ? (
            <>
              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>
                  <span className={styles.requiredMark}>*</span>
                  添加方式
                </span>
                <div className={styles.formRowControl}>
                  <div className={styles.modeRow}>
                    <Radio.Group
                      value={organizationAddMode}
                      onChange={(value) => {
                        setOrganizationAddMode(value as OrganizationAddMode);
                        setAddDepartmentIds([]);
                        setAddSelectedEmployeeIds([]);
                        setAddRoleMap({});
                      }}
                    >
                      <Radio value="department">按部门添加</Radio>
                      <Radio value="person">按人添加</Radio>
                    </Radio.Group>
                    <Typography.Text type="secondary">
                      已圈选 {addPreviewEmployees.length} 人，其中新增{' '}
                      {addNewPreviewEmployees.length} 人
                    </Typography.Text>
                  </div>
                </div>
              </div>

              {organizationAddMode === 'department' ? (
                <div className={styles.formRow}>
                  <span className={styles.formRowLabel}>
                    <span className={styles.requiredMark}>*</span>
                    选择部门
                  </span>
                  <div className={styles.formRowControl}>
                    <div className={styles.formBlock}>
                      <TreeSelect
                        multiple
                        allowClear
                        treeCheckable
                        treeCheckStrictly
                        className={styles.fullWidth}
                        placeholder="请选择商户组织部门"
                        value={addDepartmentIds}
                        treeData={orgTreeSelectData}
                        treeProps={{ defaultExpandedKeys: orgTreeDefaultExpandedKeys }}
                        onChange={(value) => setAddDepartmentIds(normalizeStringArray(value))}
                      />
                      {addDepartmentIds.length > 0 && (
                        <Space wrap>
                          {addDepartmentIds.map((departmentId) => (
                            <Tag key={departmentId}>
                              {orgDepartmentLabelMap.get(departmentId) || departmentId}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.formRow}>
                  <span className={styles.formRowLabel}>
                    <span className={styles.requiredMark}>*</span>
                    选择人员
                  </span>
                  <div className={styles.formRowControl}>
                    <div className={styles.formBlock}>
                      <Space wrap>
                        <Button
                          type="outline"
                          icon={<IconUserAdd />}
                          onClick={() => setPersonSelectorVisible(true)}
                        >
                          选择人员
                        </Button>
                        <Typography.Text type="secondary">
                          已选择 {addSelectedEmployeeIds.length} 人
                        </Typography.Text>
                      </Space>
                      {addSelectedEmployeeIds.length > 0 && (
                        <Space wrap>
                          {addSelectedEmployeeIds.map((employeeId) => {
                            const employee = hrEmployees.find((item) => item.id === employeeId);
                            return (
                              <Tag
                                key={employeeId}
                                closable
                                onClose={() =>
                                  setAddSelectedEmployeeIds((previous) =>
                                    previous.filter((item) => item !== employeeId)
                                  )
                                }
                              >
                                {employee?.name || employeeId}
                              </Tag>
                            );
                          })}
                        </Space>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>默认角色</span>
                <div className={styles.formRowControl}>
                  <div className={styles.roleBatchRow}>
                    <Select
                      mode="multiple"
                      allowClear
                      className={styles.defaultRoleSelect}
                      placeholder="请选择默认店铺角色"
                      value={addDefaultRoleIds}
                      onChange={(value) => setAddDefaultRoleIds(normalizeStringArray(value))}
                    >
                      {storeRoleItems.map((role) => (
                        <Option key={role.id} value={role.id}>
                          {role.name}
                        </Option>
                      ))}
                    </Select>
                    <Button onClick={applyDefaultRoleToPreview}>应用到全部</Button>
                  </div>
                </div>
              </div>

              <div className={styles.previewPanel}>
                <div className={styles.previewTitle}>
                  <Typography.Text className={styles.sectionTitle}>人员预览</Typography.Text>
                  <Typography.Text type="secondary">
                    已在当前店铺中的人员不会重复添加，也不会覆盖原角色。
                  </Typography.Text>
                </div>
                <Table
                  rowKey="id"
                  columns={addPreviewColumns}
                  data={addPreviewEmployees}
                  noDataElement="请先选择部门或人员"
                  pagination={false}
                  scroll={{ x: 960, y: 320 }}
                  tableLayoutFixed
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formRow}>
                <span className={styles.formRowLabel}>
                  <span className={styles.requiredMark}>*</span>
                  导入方式
                </span>
                <div className={styles.formRowControl}>
                  <Radio.Group
                    value={externalAddMode}
                    onChange={(value) => {
                      setExternalAddMode(value as ExternalAddMode);
                      setExternalBatchFileName('');
                    }}
                  >
                    <Radio value="single">在线创建单人</Radio>
                    <Radio value="batch">批量导入</Radio>
                  </Radio.Group>
                </div>
              </div>

              {externalAddMode === 'single' ? (
                <>
                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>
                      <span className={styles.requiredMark}>*</span>
                      员工姓名
                    </span>
                    <div className={styles.formRowControl}>
                      <Input
                        allowClear
                        className={styles.fullWidth}
                        placeholder="请输入员工姓名"
                        value={externalSingleForm.name}
                        onChange={(value) => updateExternalSingleForm('name', value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>
                      <span className={styles.requiredMark}>*</span>
                      员工账号
                    </span>
                    <div className={styles.formRowControl}>
                      <Input
                        allowClear
                        className={styles.fullWidth}
                        placeholder="请输入员工账号"
                        value={externalSingleForm.account}
                        onChange={(value) => updateExternalSingleForm('account', value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>
                      <span className={styles.requiredMark}>*</span>
                      手机号
                    </span>
                    <div className={styles.formRowControl}>
                      <Input
                        allowClear
                        className={styles.fullWidth}
                        placeholder="请输入手机号"
                        value={externalSingleForm.contactPhone}
                        onChange={(value) => updateExternalSingleForm('contactPhone', value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>
                      <span className={styles.requiredMark}>*</span>
                      店铺角色
                    </span>
                    <div className={styles.formRowControl}>
                      <Select
                        mode="multiple"
                        allowClear
                        className={styles.fullWidth}
                        placeholder="请选择店铺角色"
                        value={externalSingleForm.roleIds}
                        onChange={(value) =>
                          updateExternalSingleForm('roleIds', normalizeStringArray(value))
                        }
                      >
                        {storeRoleItems.map((role) => (
                          <Option key={role.id} value={role.id}>
                            {role.name}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>状态</span>
                    <div className={styles.formRowControl}>
                      <Select
                        className={styles.fullWidth}
                        value={externalSingleForm.status}
                        onChange={(value) =>
                          updateExternalSingleForm(
                            'status',
                            value === 'disabled' ? 'disabled' : 'enabled'
                          )
                        }
                      >
                        <Option value="enabled">在职</Option>
                        <Option value="disabled">离职</Option>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.formBlock}>
                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>模板下载</span>
                    <div className={styles.formRowControl}>
                      <Button onClick={handleExternalTemplateDownload}>下载员工 Excel 模板</Button>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formRowLabel}>
                      <span className={styles.requiredMark}>*</span>
                      导入文件
                    </span>
                    <div className={styles.formRowControl}>
                      <Space wrap>
                        <Button onClick={() => batchFileInputRef.current?.click()}>
                          选择文件
                        </Button>
                        <Typography.Text type="secondary">
                          {externalBatchFileName || '未选择文件'}
                        </Typography.Text>
                      </Space>
                    </div>
                  </div>

                  <Typography.Text type="secondary">
                    当前为批量导入交互原型：支持模板下载和文件选择，确认后仅反馈导入流程，不执行实际入库。
                  </Typography.Text>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        title="选择人员"
        visible={personSelectorVisible}
        autoFocus={false}
        focusLock
        style={{ width: 980 }}
        onCancel={() => setPersonSelectorVisible(false)}
        onOk={handlePersonSelectorConfirm}
      >
        <div className={styles.modalContent}>
          <div className={styles.personSearchRow}>
            <Input
              allowClear
              className={styles.personSearchInput}
              placeholder="按人员名称或工号/账号搜索"
              prefix={<IconSearch />}
              value={personKeyword}
              onChange={(value) => {
                setPersonKeyword(value);
                setPersonPage(1);
              }}
            />
            <Typography.Text type="secondary">
              当前已选 {addSelectedEmployeeIds.length} 人
            </Typography.Text>
          </div>

          <Table
            rowKey="id"
            columns={personColumns}
            data={currentPersonRows}
            noDataElement="暂无匹配人员"
            pagination={false}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: addSelectedEmployeeIds,
              preserveSelectedRowKeys: true,
              checkboxProps: (record: HrEmployeeItem) => ({
                disabled: managedEmployeeIdSet.has(record.id),
              }),
              onChange: (keys) =>
                setAddSelectedEmployeeIds(keys.map((item) => String(item))),
            }}
            scroll={{ x: 880 }}
            tableLayoutFixed
          />

          <div className={styles.modalPagination}>
            <Typography.Text type="secondary">
              已过滤 {filteredPersonRows.length} 人
            </Typography.Text>
            <Select
              className={styles.pageSizeSelect}
              value={personPageSize}
              onChange={(value) => {
                setPersonPageSize(Number(value));
                setPersonPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((item) => (
                <Option key={item} value={item}>
                  {item} 条/页
                </Option>
              ))}
            </Select>
            <Button
              disabled={personPage <= 1}
              onClick={() => setPersonPage((previous) => Math.max(1, previous - 1))}
            >
              上一页
            </Button>
            <span className={styles.pageNumber}>{personPage}</span>
            <Button
              disabled={personPage >= Math.ceil(filteredPersonRows.length / personPageSize)}
              onClick={() => setPersonPage((previous) => previous + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StoreEmployeePage;
