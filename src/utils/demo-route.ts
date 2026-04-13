import { EnterpriseRoleScope } from '@/pages/enterprise/role/data';
import { OrganizationType } from '@/pages/enterprise/organization/data';

function resolveRouteBase(pathname: string, variants: string[]) {
  return (
    variants.find((item) => pathname.startsWith(item)) ||
    variants[variants.length - 1]
  );
}

export function getOrganizationRouteBase(pathname: string) {
  return resolveRouteBase(pathname, [
    '/merchant/organization',
    '/enterprise/organization',
  ]);
}

export function getOrganizationListPath(pathname: string, type: OrganizationType) {
  return `${getOrganizationRouteBase(pathname)}?tab=${type}`;
}

export function getOrganizationCreatePath(pathname: string, type: OrganizationType) {
  return `${getOrganizationRouteBase(pathname)}/create?type=${type}`;
}

export function getOrganizationEditPath(
  pathname: string,
  id: string,
  type: OrganizationType,
  section: 'basic' | 'capability'
) {
  return `${getOrganizationRouteBase(
    pathname
  )}/edit?id=${id}&type=${type}&section=${section}`;
}

export function getEmployeeRouteBase(pathname: string) {
  return resolveRouteBase(pathname, [
    '/store-config/employee',
    '/merchant/employee',
    '/enterprise/employee',
  ]);
}

export function getEmployeeListPath(pathname: string) {
  return getEmployeeRouteBase(pathname);
}

export function getEmployeeCreatePath(pathname: string) {
  return `${getEmployeeRouteBase(pathname)}/create`;
}

export function getRoleRouteBase(pathname: string) {
  return resolveRouteBase(pathname, [
    '/store-config/role',
    '/merchant/role',
    '/enterprise/role',
  ]);
}

export function getRoleListPath(pathname: string, scope: EnterpriseRoleScope) {
  return `${getRoleRouteBase(pathname)}?tab=${scope}`;
}

export function getRoleCreatePath(pathname: string, scope: EnterpriseRoleScope) {
  return `${getRoleRouteBase(pathname)}/create?tab=${scope}`;
}

export function getRoleEditPath(
  pathname: string,
  id: string,
  scope: EnterpriseRoleScope
) {
  return `${getRoleRouteBase(pathname)}/edit?id=${id}&tab=${scope}`;
}
