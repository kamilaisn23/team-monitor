import { NextResponse } from 'next/server';
import { isDevLoginEnabled } from '@/lib/dev-login';
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag';

export const dynamic = 'force-dynamic';
export async function GET() {
  const usable = (value: string | undefined) => !!value && !/your[-_]|placeholder|changeme|replace|client[-_]id|client[-_]secret/i.test(value);
  // Only public feature flags. OAuth credentials and service tokens stay server-side.
  return NextResponse.json({
    githubConfigured: usable(process.env.AUTH_GITHUB_ID) && usable(process.env.AUTH_GITHUB_SECRET),
    devLoginEnabled: isDevLoginEnabled(),
    kerjabaikEnabled: isKerjabaikSyncEnabled(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
