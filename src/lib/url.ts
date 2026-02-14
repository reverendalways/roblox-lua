export function getBaseUrl(origin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (origin) return origin.replace(/\/$/, '');
  return '';
}


