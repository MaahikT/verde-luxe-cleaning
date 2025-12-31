/**
 * Permission utility functions for admin authorization
 */

export interface UserWithPermissions {
  role: string;
  adminPermissions: any;
}

/**
 * Check if a user has a specific admin permission
 * @param user - User object with role and adminPermissions
 * @param permission - Permission key to check (e.g., "manage_bookings")
 * @returns true if user has the permission, false otherwise
 */
export function hasPermission(
  user: UserWithPermissions,
  permission: string
): boolean {
  // Owners always have all permissions
  if (user.role === "OWNER") {
    return true;
  }

  // Non-admin/owner users have no admin permissions
  if (user.role !== "ADMIN") {
    return false;
  }

  // Check admin permissions
  const permissions = user.adminPermissions as Record<string, boolean> | null;
  return permissions?.[permission] === true;
}

/**
 * Check if a user has any of the specified permissions
 * @param user - User object with role and adminPermissions
 * @param permissions - Array of permission keys to check
 * @returns true if user has at least one of the permissions
 */
export function hasAnyPermission(
  user: UserWithPermissions,
  permissions: string[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 * @param user - User object with role and adminPermissions
 * @param permissions - Array of permission keys to check
 * @returns true if user has all of the permissions
 */
export function hasAllPermissions(
  user: UserWithPermissions,
  permissions: string[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}
