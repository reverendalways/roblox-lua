
export const PROTECTED_ACCOUNTS = [
  'owner',
  'admin',
  'moderator',
];

export function isAccountProtected(username: string): boolean {
  if (!username) return false;
  return PROTECTED_ACCOUNTS.includes(username.toLowerCase());
}

export function getProtectedAccounts(): string[] {
  return [...PROTECTED_ACCOUNTS];
}

export function addProtectedAccount(username: string): void {
  if (username && !isAccountProtected(username)) {
    PROTECTED_ACCOUNTS.push(username.toLowerCase());
  }
}

export function removeProtectedAccount(username: string): void {
  const index = PROTECTED_ACCOUNTS.indexOf(username.toLowerCase());
  if (index > -1) {
    PROTECTED_ACCOUNTS.splice(index, 1);
  }
}


