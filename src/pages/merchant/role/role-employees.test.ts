import { describe, expect, it } from 'vitest';
import { buildMerchantRoleEmployeePreviewRows } from './role-employees';

describe('merchant role employee preview helpers', () => {
  it('keeps existing employees and fills the remainder with mock rows', () => {
    const rows = buildMerchantRoleEmployeePreviewRows(
      {
        id: 'role_merchant_customer_service',
        name: '店铺客服',
        scope: 'region',
        employeeCount: 3,
        updatedAt: '2026-04-08 09:50:00',
      },
      [
        {
          id: 'employee_merchant_6',
          account: '+86-19912340006',
          name: '赵美华',
          contactPhone: '19912340006',
          organizationId: 'south-region',
          organizationDisplay: ['华南区/-/店铺客服'],
          operator: '155******27',
          operatedAt: '2026-04-08 10:25:00',
          status: 'enabled',
          isCurrentAccount: false,
          roleId: 'role_merchant_customer_service',
          departmentId: null,
          customVisibleEmployeeIds: [],
        },
      ]
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: 'employee_merchant_6',
      name: '赵美华',
      organization: '华南区/-/店铺客服',
    });
    expect(rows[1].id).toBe('role_merchant_customer_service__mock_2');
    expect(rows[2].id).toBe('role_merchant_customer_service__mock_3');
  });

  it('returns only the requested number of rows', () => {
    const rows = buildMerchantRoleEmployeePreviewRows(
      {
        id: 'role_merchant_super_admin',
        name: '商户超级管理员',
        scope: 'headquarter',
        employeeCount: 1,
        updatedAt: '2026-04-08 09:00:00',
      },
      [
        {
          id: 'employee_merchant_1',
          account: '+86-13812340001',
          name: '李文博',
          contactPhone: '13812340001',
          organizationId: 'store-online',
          organizationDisplay: ['唯寻线上商城/-/商户超级管理员'],
          operator: '—',
          operatedAt: '2026-04-08 10:00:00',
          status: 'enabled',
          isCurrentAccount: false,
          roleId: 'role_merchant_super_admin',
          departmentId: null,
          customVisibleEmployeeIds: [],
        },
        {
          id: 'extra_employee',
          account: '+86-13812340009',
          name: '额外员工',
          contactPhone: '13812340009',
          organizationId: 'store-online',
          organizationDisplay: ['唯寻线上商城/-/商户超级管理员'],
          operator: '—',
          operatedAt: '2026-04-08 10:10:00',
          status: 'enabled',
          isCurrentAccount: false,
          roleId: 'role_merchant_super_admin',
          departmentId: null,
          customVisibleEmployeeIds: [],
        },
      ]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('李文博');
  });
});
