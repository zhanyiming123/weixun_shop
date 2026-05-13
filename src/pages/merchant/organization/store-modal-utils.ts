import qs from 'query-string';
import {
  createTempOrganizationCode,
  OrganizationItem,
} from '@/pages/enterprise/organization/data';

export type MerchantStoreModalMode = 'create' | 'edit';

export type MerchantStoreFormValues = {
  name: string;
  code: string;
  address: string;
  contactPhone: string;
  managerName: string;
  managerPhone: string;
};

type MerchantStoreBaseInfo = Pick<
  OrganizationItem,
  | 'name'
  | 'code'
  | 'regionPath'
  | 'regionLabel'
  | 'address'
  | 'contactPhone'
  | 'managerName'
  | 'managerPhone'
>;

const MERCHANT_ORGANIZATION_LIST_PATH = '/merchant/organization';

export function buildMerchantStoreFormValues(
  organization?: OrganizationItem | null
): MerchantStoreFormValues {
  return {
    name: organization?.name || '',
    code: organization?.code || '',
    address: organization?.address || '',
    contactPhone: organization?.contactPhone || '',
    managerName: organization?.managerName || '',
    managerPhone: organization?.managerPhone || '',
  };
}

export function buildMerchantStoreBaseInfo(params: {
  mode: MerchantStoreModalMode;
  values: MerchantStoreFormValues;
  organization?: OrganizationItem | null;
  date?: Date;
}): MerchantStoreBaseInfo {
  const { mode, values, organization, date } = params;

  if (mode === 'edit' && !organization) {
    throw new Error('Editing organization is required for edit mode');
  }

  return {
    name: values.name.trim(),
    code:
      mode === 'create'
        ? createTempOrganizationCode('store', date)
        : organization?.code || '',
    regionPath: mode === 'create' ? [] : [...(organization?.regionPath || [])],
    regionLabel: mode === 'create' ? '' : organization?.regionLabel || '',
    address: values.address.trim(),
    contactPhone: values.contactPhone.trim(),
    managerName: values.managerName.trim(),
    managerPhone: values.managerPhone.trim(),
  };
}

export function normalizeMerchantStoreModalMode(
  value: unknown
): MerchantStoreModalMode | null {
  return value === 'create' || value === 'edit' ? value : null;
}

export function getMerchantOrganizationListPath() {
  return MERCHANT_ORGANIZATION_LIST_PATH;
}

export function getMerchantOrganizationModalPath(
  mode: MerchantStoreModalMode,
  organizationId?: string
) {
  const query = {
    modal: mode,
    ...(mode === 'edit' && organizationId ? { id: organizationId } : {}),
  };

  return `${MERCHANT_ORGANIZATION_LIST_PATH}?${qs.stringify(query)}`;
}

export function readMerchantOrganizationModalState(search: string) {
  const query = qs.parse(search);
  const mode = normalizeMerchantStoreModalMode(query.modal);
  const organizationId = typeof query.id === 'string' ? query.id.trim() : '';

  return {
    mode,
    organizationId,
  };
}
