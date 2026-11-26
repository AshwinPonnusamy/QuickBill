import React from 'react';
import { UserRole } from '../types';
import { useBusinessStore } from '../store/business.store';

export type Permission =
  | 'create_bill'
  | 'view_products'
  | 'add_customer'
  | 'view_own_bills'
  | 'view_all_invoices'
  | 'manage_products'
  | 'adjust_stock'
  | 'view_reports'
  | 'void_invoice'
  | 'settle_udhar'
  | 'manage_staff'
  | 'manage_settings'
  | 'manage_subscription'
  | 'apply_discount'
  | 'view_cost_price';

export const ROLE_PERMISSIONS: Record<UserRole, Record<Permission, boolean>> = {
  staff: {
    create_bill: true,
    view_products: true,
    add_customer: true,
    view_own_bills: true,
    view_all_invoices: false,
    manage_products: false,
    adjust_stock: false,
    view_reports: false,
    void_invoice: false,
    settle_udhar: false,
    manage_staff: false,
    manage_settings: false,
    manage_subscription: false,
    apply_discount: false,
    view_cost_price: false,
  },
  admin: {
    create_bill: true,
    view_products: true,
    add_customer: true,
    view_own_bills: true,
    view_all_invoices: true,
    manage_products: true,
    adjust_stock: true,
    view_reports: true,
    void_invoice: true,
    settle_udhar: true,
    manage_staff: true,
    manage_settings: false,
    manage_subscription: false,
    apply_discount: true,
    view_cost_price: true,
  },
  owner: {
    create_bill: true,
    view_products: true,
    add_customer: true,
    view_own_bills: true,
    view_all_invoices: true,
    manage_products: true,
    adjust_stock: true,
    view_reports: true,
    void_invoice: true,
    settle_udhar: true,
    manage_staff: true,
    manage_settings: true,
    manage_subscription: true,
    apply_discount: true,
    view_cost_price: true,
  },
};

/**
 * Single source of truth for role permission checks.
 * Fails closed: returns false when role is missing or unrecognized.
 */
export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const matrix = ROLE_PERMISSIONS[role];
  if (!matrix) return false;
  return Boolean(matrix[permission]);
}

export function useCan(): (permission: Permission) => boolean;
export function useCan(permission: Permission): boolean;
export function useCan(permission?: Permission): boolean | ((p: Permission) => boolean) {
  const role = useBusinessStore((state) => state.role);
  const isRoleLoaded = useBusinessStore((state) => state.isRoleLoaded);

  if (permission !== undefined) {
    if (!isRoleLoaded) return false;
    return can(role, permission);
  }

  return (p: Permission) => (isRoleLoaded ? can(role, p) : false);
}

interface RoleGateProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const allowed = useCan(permission);
  if (!allowed) return React.createElement(React.Fragment, null, fallback);
  return React.createElement(React.Fragment, null, children);
};
