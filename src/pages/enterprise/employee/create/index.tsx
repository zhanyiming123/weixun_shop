import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Select, Tag, Typography } from '@arco-design/web-react';
import {
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_DESCRIPTION_MAP,
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP,
  EnterpriseRoleItem,
  getEnterpriseRolePermissionTitles,
  useEnterpriseRoleItems,
} from '@/pages/enterprise/role/data';
import { EmployeeItem, DEFAULT_EMPLOYEE_ITEMS } from '@/pages/enterprise/employee/data';
import usePersistentState from '@/utils/usePersistentState';
import styles from './index.module.less';

const { useForm } = Form;
const Option = Select.Option;
const DEFAULT_ROLE_SCOPE = 'headquarter';

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

function EmployeeCreatePage() {
  const [form] = useForm();
  const [roleItems] = useEnterpriseRoleItems();
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();
  const availableRoles = useMemo(
    () =>
      roleItems
        .filter((item) => item.scope === DEFAULT_ROLE_SCOPE)
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault);
          }

          return left.name.localeCompare(right.name, 'zh-CN');
        }),
    [roleItems]
  );

  const [allEmployees] = usePersistentState<EmployeeItem[]>(
    'enterprise-employee-items-v1',
    DEFAULT_EMPLOYEE_ITEMS
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

          {selectedRole?.dataPermissions.viewScope === 'custom_employee' && (
            <Form.Item
              field="customVisibleEmployeeIds"
              label="可见员工范围："
              rules={[{ required: true, message: '请至少指定一位允许查看数据的员工' }]}
              extra="因当前角色的数据权限为“自定义员工范围”，您需要为其明确指定管辖的具体人员。"
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="请框选可见数据的员工"
                className={styles.selectorField}
              >
                {allEmployees.map((emp) => (
                  <Select.Option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.account})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

        </Form>
      </Card>
    </div>
  );
}

export default EmployeeCreatePage;
