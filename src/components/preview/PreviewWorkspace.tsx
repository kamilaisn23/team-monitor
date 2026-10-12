"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TeamScopeProvider } from "@/components/Layouts/team-scope";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { previewTeams } from "@/components/dashboard/preview-data";
import { Icon } from "@/components/ui/icon";
import type { PreviewSection } from "./navigation";
import { PreviewSections } from "./PreviewSections";

export function PreviewWorkspace({ section }: { section: PreviewSection }) {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => { content.current?.scrollTo({ top: 0 }); }, [section]);
  return (
    <SidebarProvider>
      <TeamScopeProvider previewTeams={previewTeams}>
        <div className="tm-app flex h-dvh overflow-hidden">
          <Sidebar preview previewSection={section} />
          <div ref={content} className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <Header preview previewSection={section} />
            <main
              id="main-content"
              className="tm-main mx-auto w-full max-w-screen-2xl p-4 md:p-7 2xl:p-9"
            >
              <div className="tm-preview-banner">
                <Icon name="grid" width={16} height={16} />
                <span>
                  <strong>Pratinjau desain</strong> · Seluruh angka dan nama
                  menggunakan data contoh.
                </span>
                <Link href="/login">
                  Halaman login <Icon name="arrow" width={14} height={14} />
                </Link>
              </div>
              {section === "dashboard" ? (
                <DashboardClient preview />
              ) : (
                <PreviewSections key={section} section={section} />
              )}
            </main>
          </div>
        </div>
      </TeamScopeProvider>
    </SidebarProvider>
  );
}
