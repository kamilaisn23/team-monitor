import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TeamScopeProvider } from "@/components/Layouts/team-scope";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "UNASSIGNED" && !session.user.isSuperadmin) {
    redirect("/pending");
  }

  return (
    <SidebarProvider>
      <TeamScopeProvider>
        <div className="tm-app flex h-dvh overflow-hidden">
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <Header />
            <main
              id="main-content"
              className="tm-main mx-auto w-full max-w-screen-2xl p-4 md:p-7 2xl:p-9"
            >
              {children}
            </main>
          </div>
        </div>
      </TeamScopeProvider>
    </SidebarProvider>
  );
}
