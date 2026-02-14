export function getJwtSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET;
}

export function getCsrfSecret(): string | undefined {
  return process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET;
}
