import { describe, expect, it } from 'vitest';
import {
  buildMerchantStoreBaseInfo,
  getMerchantOrganizationListPath,
  getMerchantOrganizationModalPath,
  readMerchantOrganizationModalState,
} from './store-modal-utils';

describe('merchant store modal utils', () => {
  it('builds create payload without exposing existing code or region fields from the form', () => {
    expect(
      buildMerchantStoreBaseInfo({
        mode: 'create',
        values: {
          name: '  新店铺  ',
          code: 'IGNORED-CODE',
          address: '  上海市普陀区  ',
          contactPhone: ' 021-66668888 ',
          managerName: ' 张店长 ',
          managerPhone: ' 13800001111 ',
        },
        date: new Date('2026-05-13T10:20:30'),
      })
    ).toEqual({
      name: '新店铺',
      code: 'TMP-STORE-20260513102030',
      regionPath: [],
      regionLabel: '',
      address: '上海市普陀区',
      contactPhone: '021-66668888',
      managerName: '张店长',
      managerPhone: '13800001111',
    });
  });

  it('keeps code and region fields from the existing item in edit mode', () => {
    expect(
      buildMerchantStoreBaseInfo({
        mode: 'edit',
        organization: {
          id: 'org_store_1',
          type: 'store',
          name: '原店铺',
          code: 'MD-SH-202605130001',
          regionPath: ['shanghai', 'shanghai-city', 'putuo'],
          regionLabel: '上海 / 上海市 / 普陀区',
          address: '原地址',
          contactPhone: '021-11112222',
          managerName: '原负责人',
          managerPhone: '13800002222',
          selectedStoreIds: [],
          status: 'enabled',
          capabilities: {
            selfBuiltProduct: false,
            selfBuiltMarketingActivity: false,
          },
          customProductInfoRules: [],
          createdAt: '2026-05-13 10:00:00',
          updatedAt: '2026-05-13 10:00:00',
        },
        values: {
          name: '更新店铺',
          code: '',
          address: '更新地址',
          contactPhone: '021-33334444',
          managerName: '新负责人',
          managerPhone: '13800003333',
        },
      })
    ).toEqual({
      name: '更新店铺',
      code: 'MD-SH-202605130001',
      regionPath: ['shanghai', 'shanghai-city', 'putuo'],
      regionLabel: '上海 / 上海市 / 普陀区',
      address: '更新地址',
      contactPhone: '021-33334444',
      managerName: '新负责人',
      managerPhone: '13800003333',
    });
  });

  it('maps legacy create and edit entrypoints to merchant list modal paths', () => {
    const editPath = getMerchantOrganizationModalPath('edit', 'org_store_1');
    const editSearch = `?${editPath.split('?')[1] || ''}`;

    expect(getMerchantOrganizationListPath()).toBe('/merchant/organization');
    expect(getMerchantOrganizationModalPath('create')).toBe(
      '/merchant/organization?modal=create'
    );
    expect(readMerchantOrganizationModalState(editSearch)).toEqual({
      mode: 'edit',
      organizationId: 'org_store_1',
    });
    expect(readMerchantOrganizationModalState('?modal=edit&id=org_store_1')).toEqual({
      mode: 'edit',
      organizationId: 'org_store_1',
    });
  });
});
