"use client";

import Link from "next/link";
import Image from "next/image";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-4 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A] lg:hidden"
        >
          <MenuIcon />
          <span className="sr-only">Toggle Sidebar</span>
        </button>

        {isMobile && (
          <Link href="/" className="max-[430px]:hidden">
            <Image
              src="/images/logo/logo-icon.svg"
              width={32}
              height={32}
              alt="Team Monitor"
              role="presentation"
            />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggleSwitch />
        <UserInfo />
      </div>
    </header>
  );
}
