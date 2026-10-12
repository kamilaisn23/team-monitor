import { vueShell } from '@/lib/vue-shell';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathname = '/' + path.join('/');
  const known = /^\/(preview|login|pending|dashboard|reports|admin\/(members(?:\/new|\/[^/]+\/edit)?|teams|repositories|settings)|members\/[^/]+)$/.test(pathname);
  return vueShell(known ? 200 : 404);
}
