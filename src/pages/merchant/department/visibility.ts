const HIDDEN_DEPARTMENT_HEADER_ACTION_LABELS = [
  '设置管理员',
  '导入员工',
] as const;

const HIDDEN_MEMBER_MORE_ACTION_LABELS = [
  '重置密码',
  '修改密码',
  '离职处理',
] as const;

const HIDDEN_DEPARTMENT_NODE_ACTION_LABELS = ['编辑', '删除'] as const;

export function isDepartmentHeaderActionVisible(actionLabel: string) {
  return !HIDDEN_DEPARTMENT_HEADER_ACTION_LABELS.includes(
    actionLabel as (typeof HIDDEN_DEPARTMENT_HEADER_ACTION_LABELS)[number]
  );
}

export function isMemberMoreActionVisible(actionLabel: string) {
  return !HIDDEN_MEMBER_MORE_ACTION_LABELS.includes(
    actionLabel as (typeof HIDDEN_MEMBER_MORE_ACTION_LABELS)[number]
  );
}

export function isDepartmentNodeActionVisible(actionLabel: string) {
  return !HIDDEN_DEPARTMENT_NODE_ACTION_LABELS.includes(
    actionLabel as (typeof HIDDEN_DEPARTMENT_NODE_ACTION_LABELS)[number]
  );
}
