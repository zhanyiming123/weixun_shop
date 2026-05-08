import { EmployeeItem } from '@/pages/enterprise/employee/data';
import { EnterpriseRoleItem } from '@/pages/enterprise/role/data';

export type MerchantRoleEmployeePreviewRow = {
  id: string;
  name: string;
  account: string;
  contactPhone: string;
  organization: string;
  status: EmployeeItem['status'];
  operatedAt: string;
  isCurrentAccount: boolean;
};

const MOCK_EMPLOYEE_NAMES = [
  '周嘉禾',
  '许安然',
  '沈知夏',
  '林书意',
  '陈景川',
  '宋语彤',
  '顾明远',
  '唐可欣',
  '韩屿晨',
  '程思齐',
  '姜以宁',
  '苏星野',
  '陆清妍',
  '何景行',
  '裴若彤',
  '孟书涵',
  '邵言川',
  '温知意',
  '高沐宸',
  '罗清棠',
];

const MOCK_ORGANIZATIONS_BY_SCOPE: Record<EnterpriseRoleItem['scope'], string[]> = {
  headquarter: ['商户中台', '广州运营中心', '商品经营组', '营销增长组'],
  region: ['华南一区', '广州天河店', '广州番禺店', '佛山南海店'],
  store: ['门店前台', '门店客服组', '门店仓配组', '门店导购组'],
};

function getRoleSeed(roleId: string) {
  return Array.from(roleId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function buildMockPhone(seed: number, index: number) {
  const serial = (seed * 97 + (index + 1) * 131) % 100000000;
  return `13${String(serial).padStart(9, '0')}`;
}

function formatOrganizationDisplay(values: string[]) {
  return values.filter(Boolean).join(' / ') || '-';
}

function createMockRow(
  role: Pick<EnterpriseRoleItem, 'id' | 'name' | 'scope' | 'updatedAt'>,
  index: number
): MerchantRoleEmployeePreviewRow {
  const seed = getRoleSeed(role.id);
  const name = MOCK_EMPLOYEE_NAMES[(seed + index) % MOCK_EMPLOYEE_NAMES.length];
  const phone = buildMockPhone(seed, index);
  const organizations = MOCK_ORGANIZATIONS_BY_SCOPE[role.scope];

  return {
    id: `${role.id}__mock_${index + 1}`,
    name,
    account: `+86-${phone}`,
    contactPhone: phone,
    organization: `${organizations[index % organizations.length]} / ${role.name}`,
    status: index % 5 === 4 ? 'unopened' : 'enabled',
    operatedAt: role.updatedAt,
    isCurrentAccount: false,
  };
}

export function buildMerchantRoleEmployeePreviewRows(
  role: Pick<EnterpriseRoleItem, 'id' | 'name' | 'scope' | 'employeeCount' | 'updatedAt'>,
  employeeItems: EmployeeItem[]
) {
  const matchedEmployees = employeeItems
    .filter((item) => item.roleId === role.id)
    .slice(0, role.employeeCount)
    .map<MerchantRoleEmployeePreviewRow>((item) => ({
      id: item.id,
      name: item.name,
      account: item.account,
      contactPhone: item.contactPhone,
      organization: formatOrganizationDisplay(item.organizationDisplay),
      status: item.status,
      operatedAt: item.operatedAt,
      isCurrentAccount: item.isCurrentAccount,
    }));

  if (matchedEmployees.length >= role.employeeCount) {
    return matchedEmployees;
  }

  const mockRows = Array.from(
    { length: role.employeeCount - matchedEmployees.length },
    (_, index) => createMockRow(role, matchedEmployees.length + index)
  );

  return [...matchedEmployees, ...mockRows];
}
