import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Tag,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import {
  buildEnterpriseDepartmentTree,
  EnterpriseDepartmentScope,
  readEnterpriseDepartmentStoreOptions,
} from '@/pages/enterprise/department/data';
import {
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP,
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP,
  EnterpriseRoleItem,
  getEnterpriseRolePermissionTitles,
  useEnterpriseRoleItems,
} from '@/pages/enterprise/role/data';
import styles from './index.module.less';

const { useForm } = Form;
const Option = Select.Option;
const HEADQUARTER_ORGANIZATION_ID = 'headquarter';

type EmployeeOrganizationScope = EnterpriseDepartmentScope;

type EmployeeTreeNode = {
  key: string;
  value: string;
  title: string;
  scope?: EmployeeOrganizationScope;
  disabled?: boolean;
  children?: EmployeeTreeNode[];
};

const EMPLOYEE_FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '116px' },
  wrapperCol: { flex: '1' },
  requiredSymbol: true,
};

function normalizeSingleValue(value: unknown) {
  if (typeof value === 'string' && value) {
    return value;
  }

  if (Array.isArray(value)) {
    const [firstValue] = value;
    return typeof firstValue === 'string' ? firstValue : undefined;
  }

  return undefined;
}

function flattenTreeNodes<T extends { value: string; children?: T[] }>(
  nodes: T[],
  accumulator = new Map<string, T>()
) {
  nodes.forEach((node) => {
    accumulator.set(node.value, node);
    if (node.children?.length) {
      flattenTreeNodes(node.children, accumulator);
    }
  });

  return accumulator;
}

function buildOrganizationTreeData(): EmployeeTreeNode[] {
  const storeNodes = readEnterpriseDepartmentStoreOptions().map<EmployeeTreeNode>(
    (item) => ({
      key: item.value,
      value: item.value,
      title: item.label,
      scope: 'store',
    })
  );

  return [
    {
      key: HEADQUARTER_ORGANIZATION_ID,
      value: HEADQUARTER_ORGANIZATION_ID,
      title: '总部',
      scope: 'headquarter',
    },
    {
      key: 'store_group',
      value: 'store_group',
      title: '门店',
      disabled: true,
      children: storeNodes,
    },
  ];
}

function EmployeeCreatePage() {
  const [form] = useForm();
  const [roleItems] = useEnterpriseRoleItems();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    HEADQUARTER_ORGANIZATION_ID
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();

  const organizationTreeData = useMemo(() => buildOrganizationTreeData(), []);
  const organizationNodeMap = useMemo(
    () => flattenTreeNodes(organizationTreeData),
    [organizationTreeData]
  );
  const selectedOrganization =
    organizationNodeMap.get(selectedOrganizationId) ||
    organizationNodeMap.get(HEADQUARTER_ORGANIZATION_ID);
  const selectedOrganizationScope = selectedOrganization?.scope || 'headquarter';
  const departmentTreeData = useMemo(
    () =>
      buildEnterpriseDepartmentTree(
        selectedOrganizationScope,
        selectedOrganizationScope === 'store' ? selectedOrganizationId : undefined
      ),
    [selectedOrganizationId, selectedOrganizationScope]
  );
  const availableRoles = useMemo(
    () =>
      roleItems
        .filter((item) => item.scope === selectedOrganizationScope)
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault);
          }

          return left.name.localeCompare(right.name, 'zh-CN');
        }),
    [roleItems, selectedOrganizationScope]
  );
  const selectedRole = useMemo<EnterpriseRoleItem | undefined>(
    () => availableRoles.find((item) => item.id === selectedRoleId),
    [availableRoles, selectedRoleId]
  );
  const selectedRolePermissionTitles = useMemo(
    () =>
      selectedRole
        ? getEnterpriseRolePermissionTitles(
            selectedRole.functionPermissionKeys,
            selectedRole.scope
          )
        : [],
    [selectedRole]
  );

  useEffect(() => {
    if (selectedRoleId && !selectedRole) {
      setSelectedRoleId(undefined);
      form.setFieldsValue({
        roleId: undefined,
      });
    }
  }, [form, selectedRole, selectedRoleId]);

  function handleOrganizationChange(value: unknown) {
    const nextOrganizationId = normalizeSingleValue(value) || HEADQUARTER_ORGANIZATION_ID;

    setSelectedOrganizationId(nextOrganizationId);
    setSelectedRoleId(undefined);
    form.setFieldsValue({
      organizationId: nextOrganizationId,
      departmentId: undefined,
      roleId: undefined,
    });
  }

  function handleRoleChange(value: unknown) {
    setSelectedRoleId(normalizeSingleValue(value));
  }

  return (
    <div className={styles.page}>
      <Card className={styles.formCard}>
        <Form
          form={form}
          {...EMPLOYEE_FORM_LAYOUT}
          className={styles.employeeForm}
          initialValues={{
            areaCode: 'cn-86',
            organizationId: HEADQUARTER_ORGANIZATION_ID,
          }}
        >
          <Form.Item
            required
            field="employeeName"
            label="员工姓名："
            rules={[{ required: true, message: '请输入员工姓名' }]}
          >
            <Input
              allowClear
              className={styles.fieldInput}
              placeholder="请输入员工姓名"
            />
          </Form.Item>

          <Form.Item
            required
            label="员工账号："
            extra="员工使用该手机号作为账号即可登录后台"
          >
            <Input.Group className={styles.accountGroup} compact>
              <Form.Item field="areaCode" noStyle>
                <Select className={styles.areaCodeSelect}>
                  <Option value="cn-86">中国 +86</Option>
                </Select>
              </Form.Item>
              <Form.Item
                field="employeeAccount"
                noStyle
                rules={[{ required: true, message: '请输入员工账号' }]}
              >
                <Input
                  allowClear
                  className={styles.accountInput}
                  placeholder="请输入手机号"
                />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item field="employeeCode" label="员工编号：">
            <Input
              allowClear
              className={styles.fieldInput}
              placeholder="请输入员工编号"
            />
          </Form.Item>

          <Form.Item
            required
            field="employeeContact"
            label="员工联系方式："
            rules={[{ required: true, message: '请输入员工联系方式' }]}
          >
            <Input
              allowClear
              className={styles.fieldInput}
              placeholder="请输入员工联系方式"
            />
          </Form.Item>

          <Form.Item
            required
            field="organizationId"
            label="所属总部/门店："
            rules={[{ required: true, message: '请选择所属总部/门店' }]}
          >
            <TreeSelect
              allowClear={false}
              className={styles.selectorField}
              treeData={organizationTreeData}
              triggerProps={{
                autoAlignPopupMinWidth: true,
                position: 'bl',
              }}
              treeProps={{
                defaultExpandedKeys: ['store_group'],
                showLine: true,
              }}
              onChange={handleOrganizationChange}
            />
          </Form.Item>

          <Form.Item
            required
            field="departmentId"
            label="所属部门："
            rules={[{ required: true, message: '请选择所属部门' }]}
          >
            <TreeSelect
              allowClear
              className={styles.selectorField}
              treeData={departmentTreeData}
              placeholder={
                departmentTreeData.length ? '请选择所属部门' : '请先在部门管理中配置部门'
              }
              triggerProps={{
                autoAlignPopupMinWidth: true,
                position: 'bl',
              }}
              treeProps={{
                defaultExpandAll: true,
                showLine: true,
              }}
            />
          </Form.Item>

          <Form.Item
            required
            field="roleId"
            label="所属角色："
            className={styles.roleField}
            rules={[{ required: true, message: '请选择所属角色' }]}
          >
            <div className={styles.roleContent}>
              <Select
                allowClear
                className={styles.selectorField}
                placeholder={
                  availableRoles.length
                    ? '请选择所属角色'
                    : '当前组织暂无可分配角色'
                }
                onChange={handleRoleChange}
              >
                {availableRoles.map((role) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                    {role.isDefault ? '（默认角色）' : ''}
                  </Option>
                ))}
              </Select>

              <div className={styles.permissionCard}>
                <div className={styles.permissionHeader}>
                  <Typography.Text className={styles.permissionTitle}>
                    角色权限预览
                  </Typography.Text>
                  {selectedRole && (
                    <Typography.Text className={styles.permissionRoleName}>
                      {selectedRole.name}
                    </Typography.Text>
                  )}
                </div>

                {selectedRole ? (
                  <div className={styles.permissionContent}>
                    <div className={styles.permissionSection}>
                      <span className={styles.permissionSectionTitle}>数据权限</span>
                      <div className={styles.permissionItem}>
                        <span className={styles.permissionItemTitle}>
                          {
                            ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP[
                              selectedRole.dataPermissions.viewScope
                            ]
                          }
                        </span>
                        <span className={styles.permissionItemDescription}>
                          {
                            ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP[
                              selectedRole.dataPermissions.viewScope
                            ]
                          }
                        </span>
                      </div>
                    </div>

                    <div className={styles.permissionSection}>
                      <span className={styles.permissionSectionTitle}>功能权限</span>
                      {selectedRolePermissionTitles.length ? (
                        <div className={styles.permissionTags}>
                          {selectedRolePermissionTitles.map((title) => (
                            <Tag key={`${selectedRole.id}-${title}`} size="small">
                              {title}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.permissionEmpty}>
                          当前角色未配置功能权限
                        </span>
                      )}
                    </div>

                    <div className={styles.permissionSection}>
                      <span className={styles.permissionSectionTitle}>角色说明</span>
                      <span className={styles.permissionDescription}>
                        {selectedRole.description || '暂无角色说明'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.permissionPlaceholder}>
                    选择角色后，将在这里展示对应的数据权限和功能权限列表。
                  </div>
                )}
              </div>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default EmployeeCreatePage;
