"use client";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { UserInfo } from "./user-info";
import { Icon } from "@/components/ui/icon";
import type { PreviewSection } from "@/components/preview/navigation";

const pageNames: Record<string, string> = {
  dashboard: "Dasbor tim",
  preview: "Pratinjau dasbor",
  reports: "Laporan aktivitas",
  members: "Anggota tim",
  teams: "Manajemen tim",
  repositories: "Repositori",
  settings: "Pengaturan",
};
export function Header({
  preview = false,
  previewSection = "dashboard",
}: {
  preview?: boolean;
  previewSection?: PreviewSection;
}) {
  const { toggleSidebar } = useSidebarContext();
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const section = preview
    ? previewSection
    : parts[0] === "admin"
      ? parts[1]
      : parts[0];
  const title = pageNames[section ?? ""] ?? "Workspace";
  return (
    <header className="tm-header">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="tm-icon-button"
          aria-label="Buka atau tutup navigasi"
        >
          <MenuIcon />
        </button>
        <div className="tm-breadcrumb">
          <span className="hidden sm:inline">Workspace</span>
          <Icon
            name="chevron"
            width={13}
            height={13}
            className="hidden sm:block"
          />
          <span className="truncate">{title}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <span className="tm-header-label hidden xl:flex">
          <Icon name="branch" width={14} height={14} /> GitHub &amp; GitLab
        </span>
        <span className="tm-header-divider" />
        {preview ? (
          <span className="tm-preview-badge">
            <Icon name="grid" width={15} height={15} />
            Data contoh
          </span>
        ) : (
          <UserInfo />
        )}
      </div>
    </header>
  );
}
