import type { ReactNode } from 'react';

// Next.js hosts APIs, Auth.js and the Vue SPA fallback.
// Interactive application pages live in frontend/src/*.vue.
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
