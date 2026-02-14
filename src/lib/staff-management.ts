
export interface StaffPermissions {
  canDeleteScripts: boolean;
  canDeleteAccounts: boolean;
  canTimeoutAccounts: boolean;
  canManageStaff: boolean;
  canGeneratePromoCodes: boolean;
  canShutdownDashboard: boolean;
  canViewMetrics: boolean;
  canDeleteComments: boolean;
  canManagePromotions: boolean;
  canAccessAdminPanel: boolean;
  canAccessCodes: boolean;
  canUpdateMultipliers: boolean;
}

export interface StaffMember {
  _id: string;
  username: string;
  staffRank: StaffRank;
  staffPermissions: StaffPermissions;
  staffAssignedBy: string;
  staffAssignedAt: Date;
  staffNotes?: string;
  isActive: boolean;
}

export type StaffRank = 'none' | 'junior_moderator' | 'moderator' | 'senior_moderator' | 'owner';

export const DEFAULT_RANK_PERMISSIONS: Record<StaffRank, StaffPermissions> = {
  none: {
    canDeleteScripts: false,
    canDeleteAccounts: false,
    canTimeoutAccounts: false,
    canManageStaff: false,
    canGeneratePromoCodes: false,
    canShutdownDashboard: false,
    canViewMetrics: false,
    canDeleteComments: false,
    canManagePromotions: false,
    canAccessAdminPanel: false,
    canAccessCodes: false,
    canUpdateMultipliers: false,
  },
  junior_moderator: {
    canDeleteScripts: true,
    canDeleteAccounts: false,
    canTimeoutAccounts: true,
    canManageStaff: false,
    canGeneratePromoCodes: false,
    canShutdownDashboard: false,
    canViewMetrics: true,
    canDeleteComments: true,
    canManagePromotions: false,
    canAccessAdminPanel: true,
    canAccessCodes: false,
    canUpdateMultipliers: true,
  },
  moderator: {
    canDeleteScripts: true,
    canDeleteAccounts: true,
    canTimeoutAccounts: true,
    canManageStaff: false,
    canGeneratePromoCodes: false,
    canShutdownDashboard: false,
    canViewMetrics: true,
    canDeleteComments: true,
    canManagePromotions: false,
    canAccessAdminPanel: true,
    canAccessCodes: false,
    canUpdateMultipliers: true,
  },
  senior_moderator: {
    canDeleteScripts: true,
    canDeleteAccounts: true,
    canTimeoutAccounts: true,
    canManageStaff: true,
    canGeneratePromoCodes: false,
    canShutdownDashboard: true,
    canViewMetrics: true,
    canDeleteComments: true,
    canManagePromotions: true,
    canAccessAdminPanel: true,
    canAccessCodes: false,
    canUpdateMultipliers: true,
  },
  owner: {
    canDeleteScripts: true,
    canDeleteAccounts: true,
    canTimeoutAccounts: true,
    canManageStaff: true,
    canGeneratePromoCodes: true,
    canShutdownDashboard: true,
    canViewMetrics: true,
    canDeleteComments: true,
    canManagePromotions: true,
    canAccessAdminPanel: true,
    canAccessCodes: true,
    canUpdateMultipliers: true,
  },
};

export function canManageStaff(userRank: StaffRank, targetRank: StaffRank): boolean {
  if (userRank === 'owner') return true;
  if (userRank === 'senior_moderator' && targetRank !== 'owner') return true;
  return false;
}

export function canPromoteToRank(userRank: StaffRank, targetRank: StaffRank): boolean {
  if (userRank === 'owner') return true;
  if (userRank === 'senior_moderator' && ['junior_moderator', 'moderator'].includes(targetRank)) return true;
  return false;
}

export function canDemoteFromRank(userRank: StaffRank, targetRank: StaffRank): boolean {
  if (userRank === 'owner') return true;
  if (userRank === 'senior_moderator' && ['junior_moderator', 'moderator'].includes(targetRank)) return true;
  return false;
}

export function hasPermission(userPermissions: StaffPermissions, permission: keyof StaffPermissions): boolean {
  return userPermissions[permission] === true;
}

export function hasAnyPermission(userPermissions: StaffPermissions, permissions: (keyof StaffPermissions)[]): boolean {
  return permissions.some(permission => hasPermission(userPermissions, permission));
}

export function hasAllPermissions(userPermissions: StaffPermissions, permissions: (keyof StaffPermissions)[]): boolean {
  return permissions.every(permission => hasPermission(userPermissions, permission));
}

export const STAFF_RANK_HIERARCHY: Record<StaffRank, number> = {
  none: 0,
  junior_moderator: 1,
  moderator: 2,
  senior_moderator: 3,
  owner: 4,
};

export function getRankLevel(rank: StaffRank): number {
  return STAFF_RANK_HIERARCHY[rank];
}

export function isHigherRank(userRank: StaffRank, targetRank: StaffRank): boolean {
  return getRankLevel(userRank) > getRankLevel(targetRank);
}

export function isEqualOrHigherRank(userRank: StaffRank, targetRank: StaffRank): boolean {
  return getRankLevel(userRank) >= getRankLevel(targetRank);
}

export function validateStaffAssignment(
  assignerRank: StaffRank,
  targetRank: StaffRank,
  assignerPermissions: StaffPermissions
): { valid: boolean; error?: string } {
  if (!hasPermission(assignerPermissions, 'canManageStaff')) {
    return { valid: false, error: 'You do not have permission to manage staff' };
  }

  if (!canManageStaff(assignerRank, targetRank)) {
    return { valid: false, error: 'You cannot assign this rank level' };
  }

  return { valid: true };
}

export function validateStaffRemoval(
  removerRank: StaffRank,
  targetRank: StaffRank,
  removerPermissions: StaffPermissions
): { valid: boolean; error?: string } {
  if (!hasPermission(removerPermissions, 'canManageStaff')) {
    return { valid: false, error: 'You do not have permission to manage staff' };
  }

  if (!canDemoteFromRank(removerRank, targetRank)) {
    return { valid: false, error: 'You cannot remove this staff member' };
  }

  return { valid: true };
}

export function validatePermissionUpdate(
  updaterRank: StaffRank,
  targetRank: StaffRank,
  newPermissions: StaffPermissions
): { valid: boolean; error?: string } {
  if (targetRank === 'senior_moderator' && updaterRank !== 'owner') {
    return { valid: false, error: 'Only owners can modify senior moderator permissions' };
  }

  if (newPermissions.canGeneratePromoCodes && targetRank !== 'owner') {
    return { valid: false, error: 'Only owners can have promo code generation permissions' };
  }

  if (newPermissions.canShutdownDashboard && targetRank !== 'owner') {
    return { valid: false, error: 'Only owners can have dashboard shutdown permissions' };
  }

  return { valid: true };
}

export interface StaffActivity {
  action: string;
  target?: string;
  details?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}



export const ALL_PERMISSIONS: (keyof StaffPermissions)[] = [
  'canDeleteScripts',
  'canDeleteAccounts',
  'canTimeoutAccounts',
  'canManageStaff',
  'canGeneratePromoCodes',
  'canShutdownDashboard',
  'canViewMetrics',
  'canDeleteComments',
  'canManagePromotions',
  'canAccessAdminPanel',
  'canAccessCodes',
  'canUpdateMultipliers',
];

export const PERMISSION_DESCRIPTIONS: Record<keyof StaffPermissions, string> = {
  canViewMetrics: 'View platform metrics and statistics',
  canDeleteScripts: 'Delete scripts from the platform',
  canDeleteAccounts: 'Delete user accounts',
  canTimeoutAccounts: 'Timeout user accounts',
  canDeleteComments: 'Delete user comments',
  canManagePromotions: 'See Codes',
  canGeneratePromoCodes: 'Generate promotion codes',
  canManageStaff: 'Manage staff members and permissions',
  canShutdownDashboard: 'Shutdown the admin dashboard',
  canAccessAdminPanel: 'Access the admin panel',
  canAccessCodes: 'Access codes section (Owner only)',
  canUpdateMultipliers: 'Update multipliers (Junior Mods and above)'
};
