import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
