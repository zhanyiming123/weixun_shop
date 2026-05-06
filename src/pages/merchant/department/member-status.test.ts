import { describe, expect, it } from 'vitest';
import {
  getMemberEffectiveRoleDisplay,
  getMemberStatusLabel,
  matchesMemberStatusFilter,
} from './member-status';

describe('merchant department member status helpers', () => {
  it('maps member status to display labels', () => {
    expect(getMemberStatusLabel('active')).toBe('在职');
    expect(getMemberStatusLabel('resigned')).toBe('离职');
  });

  it('removes role permissions for resigned members', () => {
    expect(getMemberEffectiveRoleDisplay('active', '普通用户')).toBe('普通用户');
    expect(getMemberEffectiveRoleDisplay('active', '')).toBe('-');
    expect(getMemberEffectiveRoleDisplay('resigned', '超级管理员')).toBe('无权限');
  });

  it('filters members by status', () => {
    expect(matchesMemberStatusFilter('active', 'all')).toBe(true);
    expect(matchesMemberStatusFilter('active', 'active')).toBe(true);
    expect(matchesMemberStatusFilter('active', 'resigned')).toBe(false);
    expect(matchesMemberStatusFilter('resigned', 'resigned')).toBe(true);
  });
});
