import { vueShell } from '@/lib/vue-shell';

export const dynamic = 'force-dynamic';

// The public root must serve the Vue landing page. Redirecting from here uses
// Railway's internal container host (`0.0.0.0:8080`) in the Location header.
export function GET() {
  return vueShell(200);
}
