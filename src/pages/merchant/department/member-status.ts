export type MemberStatus = 'active' | 'resigned';

export type MemberStatusFilter = 'all' | MemberStatus;

export function getMemberStatusLabel(status: MemberStatus) {
  return status === 'resigned' ? '离职' : '在职';
}

export function getMemberEffectiveRoleDisplay(status: MemberStatus, role: string) {
  if (status === 'resigned') {
    return '无权限';
  }

  const normalizedRole = role.trim();
  return normalizedRole || '-';
}

export function matchesMemberStatusFilter(
  status: MemberStatus,
  filter: MemberStatusFilter
) {
  if (filter === 'all') {
    return true;
  }

  return status === filter;
}
