import { describe, expect, it } from 'vitest';
import {
  getAvailableDemoIdentityIds,
  getAvailableOrganizationsForSelection,
  getDemoDefaultHomeRoute,
  getDemoCurrentPresetTitle,
  getDemoOrganizationSelectionLabel,
} from './demo';
import { OrganizationOption } from './organization';

const ORGANIZATION_OPTIONS: OrganizationOption[] = [
  {
    id: 'headquarter',
    scope: 'headquarter',
    name: '总部',
    label: '总部',
    storeIds: ['store_guangzhou', 'store_shenzhen'],
    regionIds: [],
  },
  {
    id: 'org_partner_huanan_001',
    scope: 'region',
    name: '华南大区',
    label: '华南大区（区域）',
    storeIds: ['store_guangzhou', 'store_shenzhen'],
    regionId: 'org_partner_huanan_001',
    regionIds: ['org_partner_huanan_001'],
  },
  {
    id: 'org_store_guangzhou_001',
    scope: 'store',
    name: '广州天河校区店',
    label: '广州天河校区店（店铺）',
    storeIds: ['store_guangzhou'],
  },
  {
    id: 'org_store_shenzhen_001',
    scope: 'store',
    name: '深圳南山校区店',
    label: '深圳南山校区店（店铺）',
    storeIds: ['store_shenzhen'],
  },
];

describe('demo selection helpers', () => {
  it('returns the expected identity options for merchant and store systems', () => {
    const storeOrganization = ORGANIZATION_OPTIONS[2];

    expect(
      getAvailableDemoIdentityIds('merchant', storeOrganization, ORGANIZATION_OPTIONS)
    ).toEqual(['merchant_admin', 'region_admin']);

    expect(
      getAvailableDemoIdentityIds('store', storeOrganization, ORGANIZATION_OPTIONS)
    ).toEqual(['region_admin', 'store_staff']);
  });

  it('returns only compatible organizations for the current system and identity', () => {
    expect(
      getAvailableOrganizationsForSelection(
        'merchant',
        'merchant_admin',
        ORGANIZATION_OPTIONS
      ).map((item) => item.id)
    ).toEqual(['org_store_guangzhou_001', 'org_store_shenzhen_001']);

    expect(
      getAvailableOrganizationsForSelection(
        'merchant',
        'region_admin',
        ORGANIZATION_OPTIONS
      ).map((item) => item.id)
    ).toEqual(['org_store_guangzhou_001', 'org_store_shenzhen_001']);

    expect(
      getAvailableOrganizationsForSelection(
        'store',
        'region_admin',
        ORGANIZATION_OPTIONS
      ).map((item) => item.id)
    ).toEqual(['org_store_guangzhou_001', 'org_store_shenzhen_001']);

    expect(
      getAvailableOrganizationsForSelection(
        'store',
        'store_staff',
        ORGANIZATION_OPTIONS
      ).map((item) => item.id)
    ).toEqual(['org_store_guangzhou_001']);
  });

  it('formats region-admin store labels and preset titles for the store system', () => {
    const guangzhouOrganization = ORGANIZATION_OPTIONS[2];

    expect(
      getDemoOrganizationSelectionLabel(
        'store',
        'region_admin',
        guangzhouOrganization
      )
    ).toBe('广州天河校区店');

    expect(
      getDemoCurrentPresetTitle('store', 'region_admin', guangzhouOrganization)
    ).toBe('黄颖 Manager');

    expect(
      getDemoOrganizationSelectionLabel(
        'merchant',
        'region_admin',
        guangzhouOrganization
      )
    ).toBe('广州天河校区店（店铺）');
  });

  it('uses business pages instead of dashboard as the default home route', () => {
    expect(getDemoDefaultHomeRoute('merchant')).toBe('merchant/organization');
    expect(getDemoDefaultHomeRoute('store')).toBe('product/list');
  });
});
