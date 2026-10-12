import type { ComponentType, SVGProps } from "react";
import * as Icons from "../icons";

type NavSubItem = { title: string; url: string };
type NavItem = {
    title: string;
    url?: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    items: NavSubItem[];
};
type NavSection = { label: string; items: NavItem[] };

export const NAV_DATA: NavSection[] = [
    {
        label: "WORKSPACE",
        items: [
            {
                title: "Dasbor tim",
                url: "/dashboard",
                icon: Icons.HomeIcon,
                items: [],
            },
            {
                title: "Laporan aktivitas",
                url: "/reports",
                icon: Icons.Table,
                items: [],
            },
        ],
    },
    {
        label: "MANAJEMEN",
        items: [
            {
                title: "Anggota",
                url: "/admin/members",
                icon: Icons.User,
                items: [],
            },
            {
                title: "Tim",
                url: "/admin/teams",
                icon: Icons.FourCircle,
                items: [],
            },
            {
                title: "Repositori",
                url: "/admin/repositories",
                icon: Icons.PieChart,
                items: [],
            },
            {
                title: "Pengaturan",
                url: "/admin/settings",
                icon: Icons.Authentication,
                items: [],
            },
        ],
    },
];

export const NAV_DATA_DEVELOPER: NavSection[] = [
    {
        label: "WORKSPACE",
        items: [
            {
                title: "Dasbor tim",
                url: "/dashboard",
                icon: Icons.HomeIcon,
                items: [],
            },
            {
                title: "Laporan aktivitas",
                url: "/reports",
                icon: Icons.Table,
                items: [],
            },
        ],
    },
    {
        label: "MY ACTIVITY",
        items: [
            {
                title: "My Profile",
                url: "/members/me",
                icon: Icons.User,
                items: [],
            },
        ],
    },
];
