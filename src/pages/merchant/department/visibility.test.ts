import { describe, expect, it } from 'vitest';
import {
  isDepartmentNodeActionVisible,
  isDepartmentHeaderActionVisible,
  isMemberMoreActionVisible,
} from './visibility';

describe('merchant department visibility rules', () => {
  it('hides department header actions requested by merchant admin', () => {
    expect(isDepartmentHeaderActionVisible('设置管理员')).toBe(false);
    expect(isDepartmentHeaderActionVisible('导入员工')).toBe(false);
    expect(isDepartmentHeaderActionVisible('搜索')).toBe(true);
  });

  it('hides password and offboarding member actions only', () => {
    expect(isMemberMoreActionVisible('数据从属')).toBe(true);
    expect(isMemberMoreActionVisible('重置密码')).toBe(false);
    expect(isMemberMoreActionVisible('修改密码')).toBe(false);
    expect(isMemberMoreActionVisible('离职处理')).toBe(false);
  });

  it('hides department edit, delete, and store binding actions', () => {
    expect(isDepartmentNodeActionVisible('编辑')).toBe(false);
    expect(isDepartmentNodeActionVisible('删除')).toBe(false);
    expect(isDepartmentNodeActionVisible('负责店铺')).toBe(false);
  });
});
