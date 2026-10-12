"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { LogOutIcon, UserIcon } from "./icons";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const name = session?.user?.name ?? "User";
  const image = session?.user?.image;
  const memberId = session?.user?.id;

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">Akun saya</span>

        <figure className="flex items-center gap-3">
          {image ? (
            <Image
              src={image}
              className="size-10 rounded-full"
              alt={`Avatar of ${name}`}
              role="presentation"
              width={40}
              height={40}
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span className="tm-account-name"><span>{name}</span><small>{session?.user?.isSuperadmin ? "Superadmin" : session?.user?.role?.toLowerCase()}</small></span>
            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          {image ? (
            <Image
              src={image}
              className="size-12 rounded-full"
              alt={`Avatar for ${name}`}
              role="presentation"
              width={48}
              height={48}
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <figcaption className="space-y-1 text-base font-medium">
            <div className="leading-none text-dark dark:text-white">{name}</div>
            <div className="leading-none text-sm text-gray-6 capitalize">
              {session?.user?.role?.toLowerCase() ?? ""}
            </div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        {memberId && (
          <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
            <Link
              href={`/members/${memberId}`}
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            >
              <UserIcon />
              <span className="mr-auto text-sm font-medium">Profil saya</span>
            </Link>
          </div>
        )}

        {memberId && <hr className="border-[#E8E8E8] dark:border-dark-3" />}

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={() => { setIsOpen(false); signOut({ callbackUrl: "/login" }) }}
          >
            <LogOutIcon />
            <span className="text-sm font-medium">Keluar</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
